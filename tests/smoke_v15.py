"""Smoke de UI local. Requer: pip install playwright && python -m playwright install chromium firefox webkit."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f'http://127.0.0.1:{server.server_address[1]}/'
errors = []
try:
    with sync_playwright() as p:
        for browser_name in ['chromium', 'firefox', 'webkit']:
            browser = getattr(p, browser_name).launch()
            for width in [320, 390]:
                context = browser.new_context(viewport={'width': width, 'height': 820})
                page = context.new_page()
                page.on('pageerror', lambda err: errors.append(str(err)))
                page.goto(url, wait_until='domcontentloaded')
                page.locator('#projectCards .project-card').first.wait_for()
                assert page.locator('#projectCards .project-card').count() == 3
                page.locator('#releaseMini button[data-page="liberacao"]').click()
                assert page.locator('#githubProjectCards .github-card').count() == 3
                assert page.locator('#githubRuns .github-runs-project').count() == 3
                sizes = page.evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})')
                assert sizes['page'] <= sizes['viewport'] + 1, f'{browser_name} {width}px: overflow {sizes}'
                assert not errors, f'{browser_name} {width}px: {errors}'
                print(f'OK {browser_name} {width}px')
                context.close()
            browser.close()
finally:
    server.shutdown()
