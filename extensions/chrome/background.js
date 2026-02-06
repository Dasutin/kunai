const DEFAULT_BASE_URL = 'http://localhost:3000';
const ALARM_NAME = 'kunai-unread-refresh';
const REFRESH_MINUTES = 5;

const cleanBaseUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.toString().replace(/\/$/, '');
  } catch (err) {
    return null;
  }
};

const fetchUnreadCount = async (baseUrl) => {
  const url = cleanBaseUrl(baseUrl);
  if (!url) throw new Error('Invalid site URL');
  const res = await fetch(`${url}/api/feeds`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const feeds = await res.json();
  const total = Array.isArray(feeds)
    ? feeds.reduce((sum, f) => sum + (Number(f.unreadCount) || 0), 0)
    : 0;
  return total;
};

const updateBadge = async () => {
  const { baseUrl = DEFAULT_BASE_URL } = await chrome.storage.sync.get(['baseUrl']);
  try {
    const count = await fetchUnreadCount(baseUrl);
    const text = count > 0 ? `${count}` : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: '#38bdf8' });
  } catch (err) {
    console.warn('Kunai badge update failed', err);
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#f87171' });
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#38bdf8' });
  await updateBadge();
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await updateBadge();
  }
});

chrome.action.onClicked.addListener(async () => {
  const { baseUrl = DEFAULT_BASE_URL } = await chrome.storage.sync.get(['baseUrl']);
  const url = cleanBaseUrl(baseUrl) || DEFAULT_BASE_URL;
  await chrome.tabs.create({ url });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'refresh-badge') {
    updateBadge()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, message: err?.message || 'Failed to refresh badge' }));
    return true; // keep message channel open for async response
  }
  return undefined;
});
