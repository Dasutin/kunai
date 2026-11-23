"""Production browser regression: requires Python Playwright and Chromium.

Run npm run build first, then: python3 tests/browser-refresh.py
Uses only a disposable database and local RSS/article fixture.
"""
import json
import os
from pathlib import Path
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
checks = []
stories = list(range(1, 41))
fixture_hits = 0


def passed(message):
    checks.append(message)
    print('PASS:', message, flush=True)


def wait_for(condition, message):
    for _ in range(150):
        if condition():
            return
        time.sleep(.1)
    raise AssertionError(message)


class Fixture(BaseHTTPRequestHandler):
    def do_GET(self):
        global fixture_hits
        if self.path == '/feed.xml':
            fixture_hits += 1
            origin = f'http://127.0.0.1:{self.server.server_port}'
            items = ''.join(f'<item><guid>story-{i}</guid><title>Story {i:03}</title><link>{origin}/article/{i}</link><pubDate>{datetime.fromtimestamp(1800000000+i, timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")}</pubDate><description>Fixture story {i:03} astronomy.</description></item>' for i in list(stories))
            body = f'<?xml version="1.0"?><rss version="2.0"><channel><title>Local stories</title><link>{origin}</link><description>Disposable fixture</description>{items}</channel></rss>'
            content_type = 'application/rss+xml'
        else:
            body = '<html><head><title>Fixture article</title></head><body><article><h1>Fixture article</h1>' + '<p>Readable fixture detail explains astronomy observations, careful measurements, and the data collected by local observers.</p>' * 10 + '</article></body></html>'
            content_type = 'text/html'
        raw = body.encode()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

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
    with tempfile.TemporaryDirectory(prefix='kunai-browser-refresh-') as temporary:
        scratch = Path(temporary)
        shutil.copytree(ROOT / 'server/migrations', scratch / 'migrations')
        with (scratch / 'server.log').open('w') as log:
            app = subprocess.Popen([shutil.which('node'), str(ROOT / 'dist/server/server/src/index.js')], cwd=scratch, env={
                'NODE_ENV': 'production', 'PORT': str(port), 'DATA_DIR': str(scratch / 'data'),
                'REFRESH_INTERVAL_MINUTES': '0.02', 'CONTENT_FETCH_ENABLED': 'true'
            }, stdout=log, stderr=subprocess.STDOUT)
            try:
                with sync_playwright() as p:
                    executable = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH') or shutil.which('chromium')
                    browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
                    context = browser.new_context(viewport={'width': 1440, 'height': 900})

                    def api(method, route, body=None, status=200):
                        response = context.request.fetch(base + route, method=method, data=body)
                        assert response.status == status, f'{route}: {response.status} {response.text()}'
                        return response.json() if status != 204 else None

                    def ready():
                        assert app.poll() is None, (scratch / 'server.log').read_text()
                        try:
                            return context.request.get(base + '/api/health', timeout=1000).status == 200
                        except Exception:
                            return False

                    wait_for(ready, 'Server did not start')
                    api('POST', '/api/auth/register', {'email': 'refresh@example.invalid', 'name': 'Disposable reader', 'password': 'local-browser-test-2026'}, 201)
                    fid = api('POST', '/api/feeds', {'url': fixture_base + '/feed.xml', 'title': 'Local stories'}, 201)['id']
                    api('POST', f'/api/feeds/{fid}/refresh')
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    requests = []
                    page.on('request', lambda request: requests.append((request.method, request.url)))
                    page.clock.install()
                    page.goto(base, wait_until='networkidle')
                    expect(page.get_by_text('Story 040', exact=True)).to_be_visible()
                    page.evaluate('navigator.serviceWorker.ready')
                    page.reload(wait_until='networkidle')
                    assert page.evaluate('!!navigator.serviceWorker.controller')

                    def add_story(number):
                        stories.append(number)
                        wait_for(lambda: len(api('GET', f'/api/items?search=Story%20{number:03}&searchMode=basic')['items']) == 1, 'Scheduler failed to ingest new story')

                    def tick():
                        page.clock.fast_forward(31000)

                    def wait_for_routes(routes):
                        for _ in range(150):
                            if routes:
                                return
                            page.wait_for_timeout(100)
                        raise AssertionError('Request was not intercepted')

                    add_story(41)
                    before_posts = sum(method == 'POST' and url.endswith('/api/refresh') for method, url in requests)
                    page.evaluate("window.dispatchEvent(new Event('blur'))")
                    tick()
                    expect(page.get_by_text('Story 041', exact=True)).to_be_visible()
                    assert sum(method == 'POST' and url.endswith('/api/refresh') for method, url in requests) == before_posts
                    passed('server ingests automatically; visible unfocused reader revalidates with GETs only')

                    search = page.get_by_placeholder('Search in articles')
                    page.clock.fast_forward(20000)
                    search.fill('Story 001')
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(1)
                    search.fill('')
                    expect(page.get_by_text('Story 041', exact=True)).to_be_visible()
                    add_story(42)
                    page.clock.fast_forward(11000)
                    expect(page.get_by_text('Story 042', exact=True)).to_be_visible()
                    passed('browsing and filter changes do not postpone the polling deadline')

                    row = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Story 020', exact=True))
                    with page.expect_response(lambda response: '/fetchContent' in response.url) as content:
                        row.click()
                    assert content.value.status == 200
                    expect(row.get_by_text('Readable fixture detail', exact=False).first).to_be_visible()
                    page.evaluate('window.scrollTo({top: window.scrollY + 100, behavior:"instant"})')
                    old_top = row.bounding_box()['y']
                    old_scroll = page.evaluate('window.scrollY')
                    add_story(43)
                    tick()
                    expect(page.get_by_role('button', name='Show 1 new story', exact=True)).to_be_visible()
                    assert abs(row.bounding_box()['y'] - old_top) < 2
                    assert abs(page.evaluate('window.scrollY') - old_scroll) < 2
                    expect(row.get_by_text('Readable fixture detail', exact=False).first).to_be_visible()
                    expect(page.get_by_text('Story 043', exact=True)).to_have_count(0)
                    page.get_by_role('button', name='Show 1 new story', exact=True).click()
                    expect(page.get_by_text('Story 043', exact=True)).to_be_visible()
                    page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
                    passed('background arrivals preserve expanded article and scroll position; explicit Show applies updates')

                    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))")
                    add_story(44)
                    gets = sum('/api/items?' in url for method, url in requests if method == 'GET')
                    page.clock.fast_forward(90000)
                    assert sum('/api/items?' in url for method, url in requests if method == 'GET') == gets
                    expect(page.get_by_text('Story 044', exact=True)).to_have_count(0)
                    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'))")
                    expect(page.get_by_text('Story 044', exact=True)).to_be_visible()
                    assert sum('/api/items?' in url for method, url in requests if method == 'GET') == gets + 1
                    passed('controlled hidden-tab checks stop; visibility/focus return coalesces immediate catch-up')

                    search.fill('Story 003')
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(1)
                    add_story(45)
                    tick()
                    expect(page.get_by_text('Story 003', exact=True)).to_be_visible()
                    expect(page.get_by_text('Story 045', exact=True)).to_have_count(0)
                    expect(page.get_by_role('button', name='Show 1 new story', exact=True)).to_have_count(0)
                    passed('automatic checks respect the current search filter')

                    held = []

                    def hold_refresh(route):
                        result = route.fetch()
                        held.append((route, result))

                    page.route('**/api/refresh', hold_refresh)
                    page.get_by_role('button', name='Refresh', exact=True).click()
                    page.get_by_role('button', name='Refresh', exact=True).click()
                    wait_for_routes(held)
                    assert len(held) == 1
                    search.fill('Story 004')
                    expect(page.get_by_text('Story 004', exact=True)).to_be_visible()
                    with page.expect_response(lambda response: '/api/items?' in response.url and parse_qs(urlparse(response.url).query).get('search') == ['Story 004']):
                        held[0][0].fulfill(response=held[0][1])
                    page.unroute('**/api/refresh', hold_refresh)
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(1)
                    expect(page.get_by_text('Story 004', exact=True)).to_be_visible()
                    passed('manual refresh coalesces duplicate clicks and revalidates the latest filter after awaiting the server')

                    held_items = []

                    def hold_old_query(route):
                        query = parse_qs(urlparse(route.request.url).query)
                        if query.get('search') == ['Story 005']:
                            held_items.append((route, route.fetch()))
                        else:
                            route.continue_()

                    page.route('**/api/items?*', hold_old_query)
                    search.fill('Story 005')
                    wait_for_routes(held_items)
                    search.fill('Story 006')
                    expect(page.get_by_text('Story 006', exact=True)).to_be_visible()
                    try:
                        held_items[0][0].fulfill(response=held_items[0][1])
                    except Exception:
                        pass  # The obsolete fetch may already have been aborted.
                    page.unroute('**/api/items?*', hold_old_query)
                    page.wait_for_timeout(200)
                    expect(page.locator('[data-kunai-item="true"]')).to_have_count(1)
                    expect(page.get_by_text('Story 006', exact=True)).to_be_visible()
                    passed('a delayed obsolete search response cannot replace the current results')

                    search.fill('')
                    expect(page.get_by_text('Story 045', exact=True)).to_be_visible()
                    page.get_by_role('button', name='Unread articles', exact=True).click()
                    row = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Story 040', exact=True))
                    with page.expect_response(lambda response: '/fetchContent' in response.url):
                        row.click()
                    expect(row.get_by_text('Readable fixture detail', exact=False).first).to_be_visible()
                    tick()
                    expect(page.get_by_role('button', name='Show updated stories', exact=True)).to_be_visible()
                    expect(row.get_by_text('Readable fixture detail', exact=False).first).to_be_visible()
                    page.get_by_role('button', name='Show updated stories', exact=True).click()
                    expect(page.get_by_text('Story 040', exact=True)).to_have_count(0)
                    page.get_by_role('button', name='All articles', exact=True).click()
                    expect(page.get_by_text('Story 040', exact=True)).to_be_visible()
                    passed('unread filtering keeps the article being read open until updates are explicitly applied')

                    held_read = []

                    def hold_before_read(route):
                        if not held_read:
                            held_read.append((route, route.fetch()))
                        else:
                            route.continue_()

                    page.route('**/api/items?*', hold_before_read)
                    tick()
                    wait_for_routes(held_read)
                    row = page.locator('[data-kunai-item="true"]').filter(has=page.get_by_text('Story 007', exact=True))
                    with page.expect_response(lambda response: response.url.endswith('/read')):
                        row.get_by_role('button', name='Mark read', exact=True).click()
                    try:
                        held_read[0][0].fulfill(response=held_read[0][1])
                    except Exception:
                        pass
                    page.unroute('**/api/items?*', hold_before_read)
                    page.wait_for_timeout(200)
                    expect(row.get_by_role('button', name='Mark unread', exact=True)).to_be_visible()
                    passed('a background response captured before a read action cannot undo its optimistic state')

                    page.evaluate("localStorage.setItem('viewMode',JSON.stringify('card'))")
                    page.reload(wait_until='networkidle')
                    page.get_by_text('Story 040', exact=True).click()
                    expect(page.get_by_role('dialog')).to_be_visible()
                    add_story(46)
                    tick()
                    expect(page.get_by_role('dialog')).to_be_visible()
                    expect(page.get_by_role('dialog').get_by_text('Story 040', exact=True)).to_be_visible()
                    page.get_by_role('dialog').get_by_role('button', name='Close', exact=True).click()
                    passed('automatic checks do not close or replace the open article dialog')

                    cached = page.evaluate("async()=>{let urls=[];for(const k of await caches.keys())for(const r of await(await caches.open(k)).keys())if(new URL(r.url).pathname.startsWith('/api/'))urls.push(r.url);return urls}")
                    assert not cached, cached
                    context.set_offline(True)
                    rejected = page.evaluate("fetch('/api/items').then(()=>false).catch(()=>true)")
                    assert rejected, 'Service worker served stale API data while offline'
                    context.set_offline(False)
                    assert not errors, errors
                    passed('active service worker never caches API data or returns cached stories on network failure')
                    browser.close()
            finally:
                app.terminate()
                app.wait(timeout=10)
finally:
    fixture.shutdown()
    fixture.server_close()
print(json.dumps({'checks': checks, 'fixture_requests': fixture_hits, 'disposable_database_removed': True}, indent=2))
