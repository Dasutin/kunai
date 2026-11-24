"""Mocked production browser regression; requires Python Playwright and Chromium."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
FAKE_KEY = 'test-only-browser-summary-key'
provider_calls = []
release_alpha = threading.Event()
release_beta = threading.Event()


class Fixture(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/feed.xml':
            origin = f'http://127.0.0.1:{self.server.server_port}'
            items = ''.join(f'<item><guid>{name}</guid><title>{name} article</title><link>{origin}/article/{name}</link><description>Original {name} feed story.</description></item>' for name in ['Alpha', 'Beta', 'Gamma'])
            body = f'<?xml version="1.0"?><rss version="2.0"><channel><title>Summary stories</title><link>{origin}</link><description>Local fixture</description>{items}</channel></rss>'
            kind = 'application/rss+xml'
        else:
            name = self.path.rsplit('/', 1)[-1]
            body = f'<html><head><title>{name} article</title></head><body><article><h1>{name} article</h1>' + f'<p>Original {name} story body with important facts and detailed reporting. These original paragraphs must be restored exactly after a summary toggle.</p>' * 8 + '</article></body></html>'
            kind = 'text/html'
        raw = body.encode()
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        assert self.path == '/v1/responses'
        raw = self.rfile.read(int(self.headers['Content-Length'])).decode()
        data = json.loads(raw)
        assert self.headers['Authorization'] == 'Bearer ' + FAKE_KEY
        assert FAKE_KEY not in raw
        assert data['tools'] == [] and data['tool_choice'] == 'none' and data['store'] is False
        source = json.loads(data['input'][0]['content'][0]['text'])
        name = source['title'].split()[0]
        provider_calls.append(name)
        if name == 'Alpha' and provider_calls.count(name) == 1:
            assert release_alpha.wait(20)
        failure = name == 'Beta' and provider_calls.count(name) == 1
        if failure:
            assert release_beta.wait(20)
        text = f'{name} concise AI summary.\n• Key facts from the article.'
        if name == 'Alpha':
            text += '\n<script>window.summaryExecuted = true</script>'
        payload = {'error': {'message': 'private upstream detail ' + FAKE_KEY}} if failure else {
            'status': 'completed', 'output': [{'type': 'message', 'role': 'assistant', 'content': [{'type': 'output_text', 'text': text}]}]
        }
        body = json.dumps(payload).encode()
        self.send_response(500 if failure else 200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


fixture = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
threading.Thread(target=fixture.serve_forever, daemon=True).start()
fixture_base = f'http://127.0.0.1:{fixture.server_port}'
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    port = probe.getsockname()[1]
base = f'http://localhost:{port}'

try:
    with tempfile.TemporaryDirectory(prefix='kunai-browser-summary-') as temporary:
        scratch = Path(temporary)
        shutil.copytree(ROOT / 'server/migrations', scratch / 'migrations')
        preload = scratch / 'provider.mjs'
        preload.write_text("const original = globalThis.fetch; globalThis.fetch = (url, options) => { const value = String(url); if(value === 'https://api.openai.com/v1/responses') return original(" + json.dumps(fixture_base + '/v1/responses') + ", options); if(value.startsWith(" + json.dumps(fixture_base + '/') + ")) return original(url, options); throw new Error('External network disabled in summary test'); };")
        with (scratch / 'server.log').open('w') as log:
            app = subprocess.Popen([shutil.which('node'), '--import', str(preload), str(ROOT / 'dist/server/server/src/index.js')], cwd=scratch, env={
                'NODE_ENV': 'production', 'PORT': str(port), 'DATA_DIR': str(scratch / 'data'),
                'REFRESH_INTERVAL_MINUTES': '60', 'CONTENT_FETCH_ENABLED': 'true', 'OPENAI_API_KEY': FAKE_KEY
            }, stdout=log, stderr=subprocess.STDOUT)
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
                    context = browser.new_context(viewport={'width': 1440, 'height': 1000})

                    def api(method, route, body=None, status=200):
                        response = context.request.fetch(base + route, method=method, data=body)
                        assert response.status == status, f'{route}: {response.status} {response.text()}'
                        return response.json()

                    for _ in range(100):
                        assert app.poll() is None, (scratch / 'server.log').read_text()
                        try:
                            if context.request.get(base + '/api/health', timeout=1000).status == 200:
                                break
                        except Exception:
                            pass
                        time.sleep(.1)
                    api('POST', '/api/auth/register', {'email': 'summary-browser@example.invalid', 'name': 'Disposable reader', 'password': 'local-summary-browser-2026'}, 201)
                    fid = api('POST', '/api/feeds', {'url': fixture_base + '/feed.xml'}, 201)['id']
                    api('POST', f'/api/feeds/{fid}/refresh')
                    before = api('GET', '/api/items')['items']
                    page = context.new_page()
                    errors = []
                    summary_requests = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('request', lambda request: summary_requests.append(request) if request.url.endswith('/summary') else None)
                    page.clock.install()
                    page.goto(base, wait_until='networkidle')
                    expect(page.get_by_role('button', name='AI summary', exact=True)).to_have_count(3)
                    assert not provider_calls
                    alpha = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Alpha article', exact=True))
                    with page.expect_response(lambda response: response.url.endswith('/fetchContent')):
                        alpha.get_by_text('Alpha article', exact=True).click()
                    expect(alpha.locator('.article-body')).to_contain_text('Original Alpha story body')
                    original_alpha = alpha.locator('.article-body').inner_html()
                    assert not provider_calls, 'reading an article must not request a summary'
                    alpha.get_by_role('button', name='AI summary', exact=True).click()
                    expect(alpha.locator('[data-summary-state="loading"]')).to_be_visible()
                    expect(alpha.get_by_role('status')).to_contain_text('Summarizing article')
                    assert alpha.locator('.summary-loading').evaluate('(node) => getComputedStyle(node).animationName') != 'none'
                    expect(alpha.locator('.article-body')).to_have_count(0)
                    page.emulate_media(reduced_motion='reduce')
                    assert alpha.locator('.summary-loading').evaluate('(node) => getComputedStyle(node).animationName') == 'none'
                    assert alpha.locator('.summary-spinner').evaluate('(node) => getComputedStyle(node).animationName') == 'none'
                    page.emulate_media(reduced_motion='no-preference')
                    alpha.get_by_role('button', name='Original story', exact=True).click()
                    assert alpha.locator('.article-body').inner_html() == original_alpha
                    alpha.get_by_role('button', name='AI summary', exact=True).click()
                    expect(alpha.locator('[data-summary-state="loading"]')).to_be_visible()
                    assert len(summary_requests) == 1, 'toggling while pending must reuse the request'
                    alpha.get_by_role('button', name='Original story', exact=True).click()
                    assert alpha.locator('.article-body').inner_html() == original_alpha
                    with page.expect_response(lambda response: response.url.endswith('/summary')):
                        release_alpha.set()
                    expect(alpha.locator('[data-summary-state="original"]')).to_be_visible()
                    print('PASS: each article has a button; explicit click shows shimmer; reduced motion works; toggling during loading restores original without a late switch', flush=True)

                    alpha.get_by_role('button', name='AI summary', exact=True).click()
                    expect(alpha.locator('[data-summary-state="summary"]')).to_be_visible()
                    expect(alpha.locator('.article-body')).to_contain_text('Alpha concise AI summary')
                    assert alpha.locator('.ai-summary script').count() == 0
                    assert page.evaluate('window.summaryExecuted === undefined')
                    assert provider_calls == ['Alpha'] and len(summary_requests) == 1
                    page.clock.fast_forward(31000)
                    expect(alpha.locator('[data-summary-state="summary"]')).to_be_visible()
                    assert len(summary_requests) == 1
                    alpha.get_by_role('button', name='Original story', exact=True).click()
                    assert alpha.locator('.article-body').inner_html() == original_alpha
                    print('PASS: completed summary replaces body as safe plain text, survives background updates, restores exact original HTML, and reuses the result', flush=True)

                    beta = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Beta article', exact=True))
                    with page.expect_response(lambda response: response.url.endswith('/fetchContent')):
                        beta.get_by_text('Beta article', exact=True).click()
                    expect(beta.locator('.article-body')).to_contain_text('Original Beta story body')
                    original_beta = beta.locator('.article-body').inner_html()
                    beta.get_by_role('button', name='AI summary', exact=True).click()
                    expect(beta.locator('[data-summary-state="loading"]')).to_be_visible()
                    with page.expect_response(lambda response: response.url.endswith('/summary')) as failure:
                        release_beta.set()
                    assert failure.value.status == 502
                    expect(beta.get_by_role('alert')).to_contain_text('unavailable')
                    assert FAKE_KEY not in page.locator('body').inner_text()
                    assert beta.locator('.article-body').inner_html() == original_beta
                    beta.get_by_role('button', name='AI summary', exact=True).click()
                    expect(beta.locator('[data-summary-state="summary"]')).to_be_visible()
                    expect(beta.locator('.article-body')).to_contain_text('Beta concise AI summary')
                    beta.get_by_role('button', name='Original story', exact=True).click()
                    assert beta.locator('.article-body').inner_html() == original_beta
                    assert provider_calls.count('Beta') == 2
                    assert 'Gamma' not in provider_calls
                    print('PASS: provider failure preserves original, hides upstream details, supports explicit retry, and never changes another article', flush=True)

                    calls_before = len(provider_calls)
                    for mode, title in [('card', 'Alpha article'), ('magazine', 'Beta article')]:
                        page.evaluate('(mode) => localStorage.setItem("viewMode", JSON.stringify(mode))', mode)
                        page.reload(wait_until='networkidle')
                        expect(page.get_by_role('button', name='AI summary', exact=True)).to_have_count(3)
                        row = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text(title, exact=True))
                        row.get_by_role('button', name='AI summary', exact=True).click()
                        dialog = page.get_by_role('dialog')
                        expect(dialog.locator('[data-summary-state="summary"]')).to_be_visible()
                        dialog.get_by_role('button', name='Original story', exact=True).click()
                        expect(dialog.locator('.article-body')).to_contain_text('Original ' + title.split()[0] + ' story body')
                        dialog.get_by_role('button', name='Close', exact=True).click()
                    assert len(provider_calls) == calls_before, 'server cache must survive page reloads'
                    print('PASS: card and magazine buttons open the summary reader and toggle to the original using cached provider results', flush=True)

                    page.set_viewport_size({'width': 390, 'height': 844})
                    row = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Gamma article', exact=True))
                    row.get_by_role('button', name='AI summary', exact=True).click()
                    dialog = page.get_by_role('dialog')
                    expect(dialog.locator('[data-summary-state="summary"]')).to_be_visible()
                    dialog.get_by_role('button', name='Original story', exact=True).click()
                    expect(dialog.locator('.article-body')).to_contain_text('Original Gamma')
                    print('PASS: mobile article summary and original toggle remain usable', flush=True)
                    after = api('GET', '/api/items')['items']
                    assert [(item['content'], item['snippet']) for item in after] == [(item['content'], item['snippet']) for item in before]
                    assert not errors, errors
                    assert FAKE_KEY not in (scratch / 'server.log').read_text()
                    browser.close()
            finally:
                release_alpha.set()
                release_beta.set()
                app.terminate()
                app.wait(timeout=10)
finally:
    fixture.shutdown()
    fixture.server_close()
print('PASS: mocked provider only; original stored article text intact; server stopped and disposable database removed', flush=True)
