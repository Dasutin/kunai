import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('service worker bypasses live API requests and removes the old API cache', async () => {
  const listeners = new Map();
  const names = new Set(['kunai-static-v2', 'kunai-static-v3']);
  const context = {
    self: {
      location: { origin: 'http://localhost' },
      addEventListener: (name, callback) => listeners.set(name, callback),
      clients: { claim: async () => {} }
    },
    URL,
    caches: {
      keys: async () => [...names],
      delete: async (name) => names.delete(name)
    }
  };
  vm.runInNewContext(readFileSync(new URL('../client/public/sw.js', import.meta.url), 'utf8'), context);
  for (const route of ['/api', '/api/items?search=new', '/api/auth/me', '/api/feeds']) {
    let intercepted = false;
    listeners.get('fetch')({
      request: { method: 'GET', mode: 'cors', url: `http://localhost${route}` },
      respondWith: () => { intercepted = true; }
    });
    assert.equal(intercepted, false, `${route} must never fall back to cached reader data`);
  }
  let activated;
  listeners.get('activate')({ waitUntil: (promise) => { activated = promise; } });
  await activated;
  assert.deepEqual([...names], ['kunai-static-v3']);
});
