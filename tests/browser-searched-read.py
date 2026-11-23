"""Run after npm run build with Python Playwright and Chromium installed."""
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class Fixture(BaseHTTPRequestHandler):
    def do_GET(self):
        owner = self.path.strip('/').split('.')[0]
        published = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
        titles = ['Astronomy Alpha', 'Botany Beta', 'Unrelated Control', 'Previously Read']
        items = ''.join(f'<item><guid>{owner}-{i}</guid><title>{title}</title><link>http://127.0.0.1:{self.server.server_port}/{owner}/{i}</link><pubDate>{published}</pubDate><description>{title}</description></item>' for i, title in enumerate(titles))
        body = f'<?xml version="1.0"?><rss version="2.0"><channel><title>Local fixture</title><link>http://localhost</link><description>Disposable search fixture</description>{items}</channel></rss>'.encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/rss+xml')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


fixture = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
threading.Thread(target=fixture.serve_forever, daemon=True).start()
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    port = probe.getsockname()[1]
base = f'http://localhost:{port}'
try:
    with tempfile.TemporaryDirectory(prefix='kunai-searched-read-') as temporary:
        scratch = Path(temporary)
        shutil.copytree(ROOT / 'server/migrations', scratch / 'migrations')
        with (scratch / 'server.log').open('w') as log:
            app = subprocess.Popen([shutil.which('node'), str(ROOT / 'dist/server/server/src/index.js')], cwd=scratch, env={
                'NODE_ENV': 'production', 'PORT': str(port), 'DATA_DIR': str(scratch / 'data'),
                'REFRESH_INTERVAL_MINUTES': '60', 'CONTENT_FETCH_ENABLED': 'false'
            }, stdout=log, stderr=subprocess.STDOUT)
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
                    context = browser.new_context(viewport={'width': 1440, 'height': 900})

                    def api(method, route, body=None, status=200):
                        response = context.request.fetch(base + route, method=method, data=body)
                        assert response.status == status, f'{route}: {response.status} {response.text()}'
                        return response.json() if status != 204 else None

                    for _ in range(100):
                        assert app.poll() is None, (scratch / 'server.log').read_text()
                        try:
                            if context.request.get(base + '/api/health', timeout=1000).status == 200:
                                break
                        except Exception:
                            pass
                        time.sleep(.1)
                    api('POST', '/api/auth/register', {'email': 'searched@example.invalid', 'name': 'Disposable reader', 'password': 'local-searched-test-2026'}, 201)
                    feeds = []
                    for name in ['A', 'B']:
                        fid = api('POST', '/api/feeds', {'url': f'http://127.0.0.1:{fixture.server_port}/{name}.xml', 'title': f'Feed {name}'}, 201)['id']
                        api('POST', f'/api/feeds/{fid}/refresh')
                        feeds.append(fid)

                    def state(fid):
                        return {item['title']: item for item in api('GET', f'/api/items?scope=feed&feedId={fid}')['items']}

                    original = state(feeds[0])
                    api('POST', f"/api/items/{original['Previously Read']['id']}/read", {'isRead': True})
                    page = context.new_page()
                    errors = []
                    posts = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('request', lambda request: posts.append(request) if request.method == 'POST' else None)
                    page.goto(base, wait_until='networkidle')
                    page.get_by_role('treeitem', name=re.compile('^Feed A')).click()
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(4)
                    search = page.get_by_placeholder('Search in articles')
                    options = page.get_by_role('button', name='Mark as read options', exact=True)

                    def disabled_option():
                        before = len(posts)
                        options.click()
                        entry = page.get_by_role('menuitem', name='Currently searched', exact=True)
                        expect(entry).to_be_visible()
                        expect(entry).to_be_disabled()
                        assert entry.get_attribute('aria-disabled') == 'true'
                        assert float(entry.evaluate('(node) => getComputedStyle(node).opacity')) < 1
                        entry.click(force=True)
                        page.keyboard.press('Home')
                        assert page.evaluate('document.activeElement.textContent.trim()') != 'Currently searched'
                        page.keyboard.press('ArrowUp')
                        assert page.evaluate('document.activeElement.textContent.trim()') != 'Currently searched'
                        page.keyboard.press('Escape')
                        assert len(posts) == before, 'Disabled search option sent a mutation request'

                    def mark_current(expected_search, expected_count):
                        options.click()
                        entry = page.get_by_role('menuitem', name='Currently searched', exact=True)
                        expect(entry).to_be_enabled()
                        with page.expect_response(lambda response: response.url.endswith('/api/items/markSearchedRead')) as marked:
                            entry.click()
                        assert marked.value.status == 200
                        assert marked.value.json() == {'ok': True, 'marked': expected_count}
                        payload = marked.value.request.post_data_json
                        assert payload['search'] == expected_search
                        return payload

                    disabled_option()
                    assert not state(feeds[0])['Unrelated Control']['isRead']
                    print('PASS: initially empty search leaves Currently searched visible, gray, and disabled for mouse and keyboard', flush=True)

                    search.fill('Alpha')
                    expect(page.get_by_text('Astronomy Alpha', exact=True)).to_be_visible()
                    payload = mark_current('Alpha', 1)
                    assert payload['scope'] == 'feed' and payload['feedId'] == feeds[0]
                    expect(page.locator('[data-kunai-item="true"]').get_by_role('button', name='Mark unread', exact=True)).to_be_visible()
                    current = state(feeds[0])
                    assert current['Astronomy Alpha']['isRead']
                    assert not current['Botany Beta']['isRead']
                    assert not current['Unrelated Control']['isRead']
                    assert current['Previously Read']['isRead']
                    assert not state(feeds[1])['Astronomy Alpha']['isRead']
                    print('PASS: dropdown marks only the current feed search; other articles and other feeds retain read state', flush=True)

                    search.fill('')
                    disabled_option()
                    search.fill('   ')
                    disabled_option()
                    print('PASS: clearing the query and entering whitespace immediately gray out and disable the option', flush=True)

                    api('POST', f"/api/items/{original['Astronomy Alpha']['id']}/read", {'isRead': False})
                    held = {}

                    def hold_search(route):
                        query = parse_qs(urlparse(route.request.url).query).get('search', [''])[0]
                        if query in ['Alpha', 'Beta'] and query not in held:
                            held[query] = (route, route.fetch())
                        else:
                            route.continue_()

                    def wait_held(query):
                        for _ in range(100):
                            if query in held:
                                return
                            page.wait_for_timeout(50)
                        raise AssertionError('Search request was not intercepted')

                    page.route('**/api/items?*', hold_search)
                    search.fill('Alpha')
                    wait_held('Alpha')
                    search.fill('Beta')
                    wait_held('Beta')
                    mark_current('Beta', 1)
                    expect(page.get_by_text('Botany Beta', exact=True)).to_be_visible()
                    expect(page.locator('[data-kunai-item="true"]').get_by_role('button', name='Mark unread', exact=True)).to_be_visible()
                    for route, response in held.values():
                        try:
                            route.fulfill(response=response)
                        except Exception:
                            pass  # The obsolete search fetch may have been cancelled.
                    page.unroute('**/api/items?*', hold_search)
                    page.wait_for_timeout(200)
                    assert not state(feeds[0])['Astronomy Alpha']['isRead']
                    assert state(feeds[0])['Botany Beta']['isRead']
                    assert not state(feeds[1])['Botany Beta']['isRead']
                    print('PASS: action uses the newly typed query while old and new result requests are delayed', flush=True)

                    search.fill('nonexistenttoken')
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(0)
                    mark_current('nonexistenttoken', 0)
                    assert not state(feeds[0])['Unrelated Control']['isRead']
                    print('PASS: a search with zero matches marks zero articles', flush=True)

                    api('POST', f"/api/items/{original['Unrelated Control']['id']}/save", {'saved': True})
                    search.fill('')
                    page.get_by_role('button', name='Saved', exact=True).click()
                    search.fill('Control')
                    expect(page.get_by_text('Unrelated Control', exact=True)).to_be_visible()
                    payload = mark_current('Control', 1)
                    assert payload['savedOnly'] is True
                    expect(page.locator('[data-kunai-item="true"]').get_by_role('button', name='Mark unread', exact=True)).to_be_visible()
                    assert state(feeds[0])['Unrelated Control']['isRead']
                    assert not state(feeds[1])['Unrelated Control']['isRead']
                    print('PASS: Saved search marks only matching saved articles', flush=True)

                    folder = api('POST', '/api/folders', {'name': 'Search folder'}, 201)['id']
                    api('PATCH', f'/api/feeds/{feeds[0]}', {'folderId': folder})
                    page.reload(wait_until='networkidle')
                    page.get_by_text('Search folder', exact=True).click()
                    search.fill('Alpha')
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(1)
                    payload = mark_current('Alpha', 1)
                    assert payload['scope'] == 'folder' and payload['folderId'] == folder
                    expect(page.locator('[data-kunai-item="true"]').get_by_role('button', name='Mark unread', exact=True)).to_be_visible()
                    assert state(feeds[0])['Astronomy Alpha']['isRead']
                    assert not state(feeds[1])['Astronomy Alpha']['isRead']
                    print('PASS: folder search marks only folder matches', flush=True)
                    assert not any(request.url.endswith('/api/items/markAllRead') for request in posts)
                    assert not errors, errors
                    browser.close()
            finally:
                app.terminate()
                app.wait(timeout=10)
finally:
    fixture.shutdown()
    fixture.server_close()
print('PASS: test server stopped and disposable database removed', flush=True)
