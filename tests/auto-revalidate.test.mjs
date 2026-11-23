import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { startAutoRevalidation } from '../client/src/autoRevalidate.ts';

const environment = () => {
  const page = Object.assign(new EventTarget(), { hidden: false });
  const browser = Object.assign(new EventTarget(), {
    navigator: { onLine: true },
    timers: new Map(),
    setInterval(callback, milliseconds) { this.timers.set(1, callback); this.interval = milliseconds; return 1; },
    clearInterval(id) { this.timers.delete(id); }
  });
  return { page, browser, tick: () => browser.timers.get(1)?.() };
};

test('steady polling uses current filters and catches up on return without polling hidden/offline tabs', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  const { page, browser, tick } = environment();
  const seen = [];
  let filter = 'all';
  const stop = startAutoRevalidation(async () => { seen.push(filter); }, page, browser);
  assert.equal(browser.interval, 30000);
  now = 30000;
  await tick();
  filter = 'new filter';
  now = 60000;
  await tick();
  assert.deepEqual(seen, ['all', 'new filter']);
  page.hidden = true;
  now = 90000;
  await tick();
  browser.dispatchEvent(new Event('focus'));
  assert.equal(seen.length, 2);
  page.hidden = false;
  page.dispatchEvent(new Event('visibilitychange'));
  browser.dispatchEvent(new Event('focus'));
  await setImmediate();
  assert.equal(seen.length, 3, 'focus and visibility share one catch-up');
  browser.navigator.onLine = false;
  now += 30000;
  await tick();
  assert.equal(seen.length, 3);
  browser.navigator.onLine = true;
  browser.dispatchEvent(new Event('online'));
  await setImmediate();
  assert.equal(seen.length, 4);
  now += 2000;
  browser.dispatchEvent(new Event('pageshow'));
  await setImmediate();
  assert.equal(seen.length, 5);
  stop();
  assert.equal(browser.timers.size, 0);
  now += 30000;
  page.dispatchEvent(new Event('visibilitychange'));
  browser.dispatchEvent(new Event('focus'));
  assert.equal(seen.length, 5);
});

test('slow and failing background requests do not overlap or stop future checks', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  const { page, browser, tick } = environment();
  let reject;
  let calls = 0;
  const stop = startAutoRevalidation(() => {
    calls++;
    return new Promise((_, fail) => { reject = fail; });
  }, page, browser);
  const pending = tick();
  now += 30000;
  await tick();
  browser.dispatchEvent(new Event('focus'));
  assert.equal(calls, 1);
  reject(new Error('offline'));
  await pending;
  const retry = tick();
  assert.equal(calls, 2);
  stop();
  reject(new Error('offline again'));
  await retry;
});
