"""Smoke isolado da Central PG Bot em Chromium, Firefox e WebKit (320 e 390 px).

Somente a interface da Central é exercitada; nenhuma engine de jogo é homologada.
Sem dependência de rede externa: a consulta GitHub é substituída por respostas controladas.
Para testar somente Chromium localmente: PG_BROWSERS=chromium python tests/smoke_v15.py
"""
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<link rel="stylesheet" href="styles.css" />',
    '<style>' + (ROOT/'styles.css').read_text(encoding='utf-8') + '</style>'
).replace('<script src="app.js" defer></script>', '')
JS = (ROOT/'app.js').read_text(encoding='utf-8')
PRS = {'19': '5dec0bb84321b7ba9a9943a8c09e4790a94dce04',
       '5': '61fba58f3f6d45f95ae8272a9a5105a8377cc55c',
       '6': 'f66df3cad701707522817eb82425b01af66db353',
       '295': '269003b1f4d7c358cf3bbe5f450db0181bc03c54'}
COMMITS = {'PG-Bot': '333a39e6f0963670c320c5c7bedb0ee0123a3084',
           'PG-Estrategia': '279e825423cd416b9ee4caf704ab49dbe9ede62c',
           'PG-Arcade': '39b787a1a3ea2296001791caa49a0fea1a4c21c5'}
FAKE_GET = '''({commits, prs}) => {
 window.fetch = async (url) => {
   const path = new URL(url).pathname.split('/');
   const repo = path[3], n = path.at(-1);
   const isPr = path.includes('pulls'), isRuns = path.includes('runs');
   const sha = isPr ? prs[n] : commits[repo];
   if (!sha) throw new Error('Endpoint de fixture inesperado: ' + url);
   const data = isRuns ? {workflow_runs:[{
     id:5001,name:'Qualidade',status:'completed',conclusion:'success',head_sha:sha,
     html_url:`https://github.com/pabloguilherme1121/${repo}/actions/runs/5001`,
     created_at:'2026-11-06T12:00:00Z',event:'push'
   }]} : isPr ? {number:Number(n),state:n==='19'?'open':'closed',draft:n==='19',merged:n!=='19',
     head:{sha},merge_commit_sha:sha,html_url:`https://github.com/pabloguilherme1121/${repo}/pull/${n}`
   } : {sha,html_url:`https://github.com/pabloguilherme1121/${repo}/commit/${sha}`,
     commit:{committer:{date:'2026-11-02T12:00:00Z'}}};
   return {ok:true,status:200,json:async()=>data};
 };
}'''

engines = [x.strip() for x in os.environ.get('PG_BROWSERS', 'chromium,firefox,webkit').split(',') if x.strip()]
with sync_playwright() as p:
    for engine in engines:
        args = {'headless': True}
        if engine == 'chromium' and shutil.which('chromium'):
            args.update(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
        browser = getattr(p, engine).launch(**args)
        widths = [320, 390, 1280] if engine == 'chromium' else [320, 390]
        for width in widths:
            context = browser.new_context(viewport={'width': width, 'height': 850})
            page = context.new_page()
            page.set_default_timeout(12000)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.set_content(HTML)
            page.evaluate(FAKE_GET, {'commits': COMMITS, 'prs': PRS})
            page.add_script_tag(content=JS)
            assert page.locator('#projectCards .project-card').count() == 3
            assert page.locator('#storageConflict').is_hidden()
            page.locator('#releaseMini button[data-page="liberacao"]').click()
            assert page.locator('#githubProjectCards .github-card').count() == 3
            assert page.locator('#githubPrCards .github-pr').count() == 4
            page.locator('#refreshGithub').click()
            page.wait_for_function('document.querySelectorAll("#githubRuns .github-run").length === 3')
            assert 'sem alteração automática' in page.locator('#githubErrors').inner_text().lower()
            size = page.evaluate('({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth})')
            assert size['scroll'] <= size['viewport'] + 1, f'Overflow {engine} {width}: {size}'
            assert not errors, f'{engine} {width}: {errors}'
            print(f'PASS {engine} {width}px: 3 projetos, 4 PRs, runs, sem erros e sem overflow', flush=True)
            if os.environ.get('PG_SCREENSHOTS') == '1':
                page.screenshot(path=str(ROOT/f'pg-bot-v17-{engine}-{width}.png'),full_page=True)
            context.close()
        browser.close()
