const input = document.getElementById('baseUrl');
const button = document.getElementById('save');
const message = document.getElementById('message');

const DEFAULT_BASE_URL = 'http://localhost:3000';

const cleanBaseUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.toString().replace(/\/$/, '');
  } catch (err) {
    return null;
  }
};

const load = async () => {
  const stored = await browser.storage.sync.get('baseUrl');
  const baseUrl = stored.baseUrl || DEFAULT_BASE_URL;
  input.value = baseUrl;
};

const save = async () => {
  message.textContent = '';
  message.className = 'status';
  const url = input.value.trim() || DEFAULT_BASE_URL;
  const clean = cleanBaseUrl(url);
  if (!clean) {
    message.textContent = 'Enter a valid URL (e.g., https://example.com)';
    message.className = 'status error';
    return;
  }
  await browser.storage.sync.set({ baseUrl: clean });
  browser.runtime.sendMessage({ type: 'refresh-badge' });
  message.textContent = 'Saved. Badge refreshed.';
};

button.addEventListener('click', save);
document.addEventListener('DOMContentLoaded', load);
