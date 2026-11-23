import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

test('RSS refresh results and full-text search through the production API', { timeout: 30000 }, async (t) => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), 'kunai-regression-'));
  const hits = new Map();
  const articles = [
    { guid: 'alpha', title: 'Fixture Alpha', content: 'Unique astronomy observations.' },
    { guid: 'beta', title: 'Fixture Beta', content: 'Unique botany observations.' }
  ];
  const published = new Date().toUTCString();
  let holdGood = null;
  const fixture = http.createServer((req, res) => {
    hits.set(req.url, (hits.get(req.url) || 0) + 1);
    res.setHeader('Content-Type', 'application/rss+xml');
    if (!['/good.xml', '/other.xml'].includes(req.url)) return res.end('<rss><channel><item>unfinished');
    const items = articles.map((article) => `<item><guid isPermaLink="false">${article.guid}</guid><title>${article.title}</title><link>http://127.0.0.1:${fixture.address().port}/${article.guid}</link><pubDate>${published}</pubDate><description>${article.content}</description></item>`).join('');
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title><link>http://localhost</link><description>Local test</description>${items}</channel></rss>`;
    if (holdGood) holdGood.then(() => res.end(xml));
    else res.end(xml);
  });
  let app;
  let output = '';
  try {
    fixture.listen(0, '127.0.0.1');
    await once(fixture, 'listening');
    const fixtureBase = `http://127.0.0.1:${fixture.address().port}`;
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));

    // Running in scratch avoids loading any local .env or touching an existing database.
    cpSync(path.join(root, 'server/migrations'), path.join(scratch, 'migrations'), { recursive: true });
    app = spawn(process.execPath, [path.join(root, 'dist/server/server/src/index.js')], {
      cwd: scratch,
      env: {
        NODE_ENV: 'production', PORT: String(port), DATA_DIR: path.join(scratch, 'data'),
        REFRESH_INTERVAL_MINUTES: '60', CONTENT_FETCH_ENABLED: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    app.stdout.on('data', (chunk) => { output += chunk; });
    app.stderr.on('data', (chunk) => { output += chunk; });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(app.exitCode, null, output);
      try {
        ready = (await fetch(`${base}/api/health`)).ok;
        if (ready) break;
      } catch { /* Wait until the real listener is ready. */ }
      await delay(100);
    }
    assert.ok(ready, output);

    let cookie = '';
    const api = async (route, { method = 'GET', body, status = 200 } = {}) => {
      const response = await fetch(base + route, {
        method, headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await response.text();
      assert.equal(response.status, status, `${method} ${route}: ${text}`);
      const session = response.headers.get('set-cookie');
      if (session) cookie = session.split(';')[0];
      return text ? JSON.parse(text) : null;
    };
    await api('/api/auth/register', {
      method: 'POST', status: 201,
      body: { email: 'regression@example.invalid', name: 'Disposable test', password: 'local-test-password-2026' }
    });
    const refresh = () => api('/api/refresh', { method: 'POST' });
    await t.test('an empty refresh is successful with zero counts', async () => {
      assert.deepEqual(await refresh(), { ok: true, refreshed: 0, failed: 0, skipped: 0, failures: [] });
    });

    const createFeed = (url, title) => api('/api/feeds', { method: 'POST', status: 201, body: { url, title } });
    // The broken feed sorts first: a failure must not prevent later healthy feeds refreshing.
    const bad = await createFeed(`${fixtureBase}/broken.xml`, 'A Broken fixture');
    const good = await createFeed(`${fixtureBase}/good.xml`, 'Z Healthy fixture');
    const disabled = await createFeed(`${fixtureBase}/disabled.xml`, 'Disabled fixture');
    await api(`/api/feeds/${disabled.id}`, { method: 'PATCH', body: { enabled: false } });

    await t.test('mixed refresh reports failure, continues ingestion, and skips disabled feeds', async () => {
      const result = await refresh();
      assert.equal(result.ok, false);
      assert.equal(result.refreshed, 1);
      assert.equal(result.failed, 1);
      assert.equal(result.skipped, 1);
      assert.equal(result.failures.length, 1);
      assert.equal(result.failures[0].feedId, bad.id);
      assert.equal(result.failures[0].title, 'A Broken fixture');
      assert.ok(result.failures[0].message);
      assert.equal((await api('/api/items')).items.length, 2);
      const feeds = await api('/api/feeds');
      assert.equal(feeds.find((feed) => feed.id === bad.id).lastFetchStatus, 'error');
      assert.equal(feeds.find((feed) => feed.id === good.id).lastFetchStatus, 'ok');
      assert.equal(hits.get('/disabled.xml'), undefined);
    });

    await t.test('FTS supports terms, phrases, prefixes, no matches, filters, and pagination', async () => {
      const search = (term, extra = '') => api(`/api/items?searchMode=fts&search=${encodeURIComponent(term)}${extra}`);
      for (const term of ['astronomy', 'ASTRONOMY', 'astron*', '"astronomy observations"']) {
        assert.deepEqual((await search(term)).items.map((item) => item.title), ['Fixture Alpha']);
      }
      assert.deepEqual((await search('nonexistenttoken')).items, []);
      assert.deepEqual((await api('/api/items?search=astronomy')).items.map((item) => item.title), ['Fixture Alpha']);
      assert.deepEqual((await api('/api/items?search=astronomy&searchMode=basic')).items.map((item) => item.title), ['Fixture Alpha']);
      assert.deepEqual((await search('astronomy', `&scope=feed&feedId=${bad.id}`)).items, []);
      const alpha = (await search('astronomy')).items[0];
      await api(`/api/items/${alpha.id}/read`, { method: 'POST', body: { isRead: true } });
      assert.deepEqual((await search('astronomy', '&unreadOnly=true')).items, []);
      const first = await search('Fixture', '&limit=1');
      assert.equal(first.items.length, 1);
      assert.ok(first.nextCursor);
      const second = await search('Fixture', `&limit=1&cursor=${encodeURIComponent(first.nextCursor)}`);
      assert.equal(second.items.length, 1);
      assert.notEqual(second.items[0].id, first.items[0].id);
      assert.equal(second.nextCursor, null);
    });

    await t.test('another mixed refresh adds healthy content without duplicates', async () => {
      articles.push({ guid: 'gamma', title: 'Fixture Gamma', content: 'Unique geology observations.' });
      assert.equal((await refresh()).ok, false);
      assert.equal((await api('/api/items')).items.length, 3);
      assert.deepEqual((await api('/api/items?search=geology&searchMode=fts')).items.map((item) => item.title), ['Fixture Gamma']);
    });

    await t.test('all failures report zero successes', async () => {
      await api(`/api/feeds/${good.id}`, { method: 'PATCH', body: { enabled: false } });
      const result = await refresh();
      assert.equal(result.ok, false);
      assert.equal(result.refreshed, 0);
      assert.equal(result.failed, 1);
      assert.equal(result.skipped, 2);
    });

    await t.test('all-success refresh clears failure details and preserves deduplication', async () => {
      await api(`/api/feeds/${bad.id}`, { method: 'DELETE', status: 204 });
      await api(`/api/feeds/${good.id}`, { method: 'PATCH', body: { enabled: true } });
      assert.deepEqual(await refresh(), { ok: true, refreshed: 1, failed: 0, skipped: 1, failures: [] });
      assert.equal((await api('/api/items')).items.length, 3);
      assert.equal(hits.get('/disabled.xml'), undefined);
    });

    await t.test('concurrent refresh requests share one upstream batch', async () => {
      let release;
      holdGood = new Promise((resolve) => { release = resolve; });
      const before = hits.get('/good.xml');
      const first = refresh();
      try {
        for (let attempt = 0; attempt < 100 && hits.get('/good.xml') === before; attempt++) await delay(10);
        assert.equal(hits.get('/good.xml'), before + 1);
        const second = refresh();
        await delay(100);
        assert.equal(hits.get('/good.xml'), before + 1);
        release();
        const results = await Promise.all([first, second]);
        assert.deepEqual(results[0], results[1]);
        assert.equal(results[0].ok, true);
      } finally {
        release();
        holdGood = null;
        await first;
      }
    });

    let other;
    const markSearched = (body, status = 200) => api('/api/items/markSearchedRead', { method: 'POST', body, status });
    const unreadCount = async (feedId) => (await api('/api/feeds')).find((feed) => feed.id === feedId).unreadCount;
    await t.test('searched marking includes more than 1000 matches and preserves other feeds and non-matches', async () => {
      for (let i = 0; i < 1005; i++) articles.push({ guid: `bulk-${i}`, title: `Bulk Needle ${i}`, content: 'Pagination regression.' });
      articles.push({ guid: 'control', title: 'Control Nonmatch', content: 'Do not mark this article.' });
      await api(`/api/feeds/${good.id}/refresh`, { method: 'POST' });
      other = await createFeed(`${fixtureBase}/other.xml`, 'Other scope');
      await api(`/api/feeds/${other.id}/refresh`, { method: 'POST' });
      const displayed = await api(`/api/items?scope=feed&feedId=${good.id}&search=Bulk%20Needle&searchMode=basic`);
      assert.equal(displayed.items.length, 1000);
      assert.ok(displayed.nextCursor);
      const before = await unreadCount(good.id);
      assert.deepEqual(await markSearched({ scope: 'feed', feedId: good.id, search: 'Bulk Needle', searchMode: 'basic' }), { ok: true, marked: 1005 });
      assert.equal(await unreadCount(good.id), before - 1005);
      assert.equal(await unreadCount(other.id), 1009);
      assert.deepEqual((await api(`/api/items?scope=feed&feedId=${good.id}&search=Bulk%20Needle&searchMode=basic&unreadOnly=true`)).items, []);
      const control = (await api(`/api/items?scope=feed&feedId=${good.id}&search=Control%20Nonmatch&searchMode=basic`)).items[0];
      assert.equal(control.isRead, false);
      assert.deepEqual(await markSearched({ scope: 'feed', feedId: good.id, search: 'Bulk Needle', searchMode: 'basic' }), { ok: true, marked: 0 });
    });

    await t.test('empty, whitespace, invalid FTS, and missing scope IDs never broaden the bulk operation', async () => {
      const before = await unreadCount(other.id);
      for (const search of [undefined, '', '   ', '\t\n']) {
        await markSearched({ scope: 'newsfeed', search }, 400);
      }
      await markSearched({ scope: 'feed', search: 'Needle' }, 400);
      await markSearched({ scope: 'folder', search: 'Needle' }, 400);
      await markSearched({ scope: 'newsfeed', search: '"unterminated', searchMode: 'fts' }, 400);
      assert.equal(await unreadCount(other.id), before);
      assert.deepEqual(await markSearched({ scope: 'newsfeed', search: 'nonexistenttoken', searchMode: 'fts' }), { ok: true, marked: 0 });
    });

    await t.test('folder, tag, and unread filters match the list; FTS marks the remaining matching pages', async () => {
      const folder = await api('/api/folders', { method: 'POST', status: 201, body: { name: 'Search scope' } });
      await api(`/api/feeds/${other.id}`, { method: 'PATCH', body: { folderId: folder.id } });
      const item = (await api(`/api/items?scope=feed&feedId=${other.id}&search=Bulk%20Needle&searchMode=basic&limit=1`)).items[0];
      await api(`/api/items/${item.id}/tags`, { method: 'POST', body: { add: ['searched-target'] } });
      const tag = (await api('/api/tags')).find((entry) => entry.name === 'searched-target');
      const request = { scope: 'folder', folderId: folder.id, search: '"Bulk Needle"', searchMode: 'fts', unreadOnly: true, tagIds: [tag.id] };
      const before = await unreadCount(other.id);
      assert.deepEqual(await markSearched(request), { ok: true, marked: 1 });
      assert.equal(await unreadCount(other.id), before - 1);
      assert.deepEqual(await markSearched(request), { ok: true, marked: 0 });
      assert.deepEqual(await markSearched({ ...request, tagIds: [] }), { ok: true, marked: 1004 });
      assert.equal(await unreadCount(other.id), 4);
    });

    await t.test('Saved uses literal title search and muted feeds are excluded unless requested', async () => {
      const control = (await api(`/api/items?scope=feed&feedId=${good.id}&search=Control%20Nonmatch&searchMode=basic`)).items[0];
      await api(`/api/items/${control.id}/save`, { method: 'POST', body: { saved: true } });
      const gamma = (await api(`/api/items?scope=feed&feedId=${good.id}&search=geology&searchMode=fts`)).items[0];
      await api(`/api/items/${gamma.id}/save`, { method: 'POST', body: { saved: true } });
      assert.deepEqual((await api('/api/items?savedOnly=true&search=geology&searchMode=fts')).items, []);
      assert.deepEqual(await markSearched({ scope: 'newsfeed', search: 'geology', savedOnly: true, searchMode: 'fts' }), { ok: true, marked: 0 });
      assert.deepEqual(await markSearched({ scope: 'newsfeed', search: 'Control Nonmatch', savedOnly: true }), { ok: true, marked: 1 });
      await api(`/api/feeds/${other.id}`, { method: 'PATCH', body: { muted: true } });
      assert.deepEqual(await markSearched({ scope: 'newsfeed', search: 'Control Nonmatch', searchMode: 'basic' }), { ok: true, marked: 0 });
      assert.deepEqual(await markSearched({ scope: 'newsfeed', search: 'Control Nonmatch', searchMode: 'basic', mutedIncluded: true }), { ok: true, marked: 1 });
    });
  } finally {
    if (app && app.exitCode === null) {
      app.kill('SIGTERM');
      await once(app, 'exit');
    }
    fixture.closeAllConnections();
    await new Promise((resolve) => fixture.close(resolve));
    rmSync(scratch, { recursive: true, force: true });
  }
});
