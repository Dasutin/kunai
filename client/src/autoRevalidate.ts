const REVALIDATE_INTERVAL_MS = 30_000;

// Keep a steady timer even when the reader changes filters or starts a request.
export const startAutoRevalidation = (
  revalidate: () => Promise<unknown>,
  page: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> = document,
  browser: Pick<Window, 'navigator' | 'setInterval' | 'clearInterval' | 'addEventListener' | 'removeEventListener'> = window
) => {
  let running = false;
  let stopped = false;
  let lastStarted = -Infinity;

  const run = async () => {
    if (stopped || running || page.hidden || browser.navigator.onLine === false) return;
    // Focus and visibility events commonly arrive together.
    if (Date.now() - lastStarted < 1_000) return;
    running = true;
    lastStarted = Date.now();
    try {
      await revalidate();
    } catch {
      // A background request must leave the current stories intact; retry later.
    } finally {
      running = false;
    }
  };

  const timer = browser.setInterval(run, REVALIDATE_INTERVAL_MS);
  page.addEventListener('visibilitychange', run);
  browser.addEventListener('focus', run);
  browser.addEventListener('online', run);
  browser.addEventListener('pageshow', run);
  return () => {
    stopped = true;
    browser.clearInterval(timer);
    page.removeEventListener('visibilitychange', run);
    browser.removeEventListener('focus', run);
    browser.removeEventListener('online', run);
    browser.removeEventListener('pageshow', run);
  };
};
