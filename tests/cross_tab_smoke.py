"""Regressão: duas abas não podem sobrescrever silenciosamente os registros.

No CI (PG_USE_HTTP=1), usa origem real em localhost e eventos storage nativos.
No sandbox local, sem navegação por rede, simula a Storage API no documento.
"""
import os
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REAL_HTTP = os.environ.get('PG_USE_HTTP') == '1'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<link rel="stylesheet" href="styles.css" />',
    '<style>' + (ROOT/'styles.css').read_text(encoding='utf-8') + '</style>'
).replace('<script src="app.js" defer></script>', '')
JS = (ROOT/'app.js').read_text(encoding='utf-8')
errors = []

def edit_criterion(page, evidence):
    page.evaluate('document.querySelector("[data-page=criterios]").click()')
    page.locator('[data-open-record="bot-ui"]').evaluate('(e) => e.click()')
    page.locator('#editStatus').select_option('comprovado')
    page.locator('#editEvidence').fill(evidence)
    page.locator('#editForm button[type="submit"]').click()
    assert not page.locator('#editDialog').evaluate('(el) => el.open')

server = None
try:
    if REAL_HTTP:
        handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        Thread(target=server.serve_forever, daemon=True).start()
        url = f'http://127.0.0.1:{server.server_address[1]}/'

    with sync_playwright() as p:
        launch_args = {'headless': True}
        if shutil.which('chromium'):
            launch_args['executable_path'] = shutil.which('chromium')
            launch_args['args'] = ['--no-sandbox']
        browser = p.chromium.launch(**launch_args)
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.set_default_timeout(10000)
        first, second = context.new_page(), context.new_page()
        for page in [first, second]:
            page.on('pageerror', lambda e: errors.append(str(e)))
            if REAL_HTTP:
                page.goto(url, wait_until='domcontentloaded')
                page.locator('#projectCards .project-card').first.wait_for()
            else:
                page.set_content(HTML)
                page.evaluate('''() => {
                  window.__store = new Map();
                  Object.defineProperty(window, 'localStorage', {configurable: true, value: {
                    getItem(k) { return window.__store.has(k) ? window.__store.get(k) : null; },
                    setItem(k, v) { window.__store.set(k, String(v)); },
                    removeItem(k) { window.__store.delete(k); }
                  }});
                }''')
                page.add_script_tag(content=JS)
            assert page.locator('#storageConflict').is_hidden()

        edit_criterion(first, 'https://github.com/test/primeira-aba')
        original = first.evaluate('localStorage.getItem("pgbot-homologacao-v1")')
        assert original and 'primeira-aba' in original
        if not REAL_HTTP:
            # No CI, o próprio navegador dispara este evento ao gravar em outra aba.
            second.evaluate('''(v) => {
              window.__store.set('pgbot-homologacao-v1', v);
              window.dispatchEvent(new StorageEvent('storage', {key:'pgbot-homologacao-v1',newValue:v}));
            }''', original)
        second.locator('#storageConflict').wait_for(state='visible')
        edit_criterion(second, 'https://github.com/test/segunda-aba')
        assert second.locator('#storageConflict').is_visible()
        assert original == second.evaluate('localStorage.getItem("pgbot-homologacao-v1")'), 'Sobrescrita de evidência'
        assert 'conflito' in second.locator('#saveIndicator').inner_text().lower()
        second.set_viewport_size({'width': 320, 'height': 844})
        sizes = second.evaluate('({scroll:document.documentElement.scrollWidth,viewport:innerWidth})')
        assert sizes['scroll'] <= sizes['viewport'] + 1, f'Overflow na faixa de conflito 320px: {sizes}'
        if os.environ.get('PG_SCREENSHOTS') == '1':
            second.screenshot(path=str(ROOT/'pg-bot-v17-conflito-320.png'))
        second.set_viewport_size({'width': 390, 'height': 844})
        second.once('dialog', lambda dialog: dialog.accept())
        second.locator('#reloadLocalBtn').click()
        assert second.locator('#storageConflict').is_hidden()
        second.evaluate('document.querySelector("[data-page=criterios]").click()')
        second.locator('[data-open-record="bot-ui"]').evaluate('(e) => e.click()')
        assert second.locator('#editEvidence').input_value() == 'https://github.com/test/primeira-aba'
        second.locator('#editDialog [data-close]').first.click()
        edit_criterion(second, 'https://github.com/test/versao-recarregada')
        saved = second.evaluate('JSON.parse(localStorage.getItem("pgbot-homologacao-v1"))')
        assert next(x for x in saved['criteria'] if x['id'] == 'bot-ui')['evidence'] == 'https://github.com/test/versao-recarregada'
        assert not errors, f'Erros de JavaScript: {errors}'
        print(f'PASS: conflito, proteção, recuperação, edição e 320/390 px ({"origem HTTP" if REAL_HTTP else "armazenamento simulado"})', flush=True)
        context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
