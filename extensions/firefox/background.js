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

const setBadge = async (text, color) => {
  await browser.browserAction.setBadgeText({ text });
  if (color) {
    await browser.browserAction.setBadgeBackgroundColor({ color });
  }
};

const updateBadge = async () => {
  const { baseUrl = DEFAULT_BASE_URL } = await browser.storage.sync.get('baseUrl');
  try {
    const count = await fetchUnreadCount(baseUrl);
    const text = count > 0 ? `${count}` : '';
    await setBadge(text, '#38bdf8');
  } catch (err) {
    console.warn('Kunai badge update failed', err);
    await setBadge('!', '#f87171');
  }
};

const scheduleAlarm = async () => {
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
};

browser.runtime.onInstalled.addListener(async () => {
  await setBadge('', '#38bdf8');
  await updateBadge();
  await scheduleAlarm();
});

browser.runtime.onStartup.addListener(async () => {
  await updateBadge();
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await updateBadge();
  }
});

browser.browserAction.onClicked.addListener(async () => {
  const { baseUrl = DEFAULT_BASE_URL } = await browser.storage.sync.get('baseUrl');
  const url = cleanBaseUrl(baseUrl) || DEFAULT_BASE_URL;
  await browser.tabs.create({ url });
});

browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'refresh-badge') {
    updateBadge();
  }
});
