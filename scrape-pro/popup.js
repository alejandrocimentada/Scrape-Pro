const $ = (id) => document.getElementById(id);
const { t } = ssI18n;
let tabId = null;
let format = 'both';
let active = false;
let shortcutSet = true;

function renderToggle(isActive) {
  active = isActive;
  document.body.classList.toggle('on', active);
  $('toggle').setAttribute('aria-checked', String(active));
  $('status').textContent = t(active ? 'activeOnTab' : 'off');
}

function renderFormat() {
  document.querySelectorAll('#format button').forEach((b) => b.classList.toggle('active', b.dataset.format === format));
}

function renderLanguage() {
  ssI18n.apply(document);
  renderToggle(active);
  if (!shortcutSet) $('shortcut').textContent = t('setShortcut');
  document.querySelectorAll('#uiLang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === ssI18n.lang));
}

function showError(message) {
  $('error').textContent = message || t('somethingWrong');
  $('error').hidden = false;
}

function askStatus(text, isError = false) {
  $('askStatus').textContent = text;
  $('askStatus').classList.toggle('err', isError);
  $('askStatus').hidden = !text;
}

async function refresh() {
  if (tabId == null) return;
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE', tabId });
  renderToggle(state.active);
  renderFormat();
}

async function runAsk() {
  const request = $('askInput').value.trim();
  if (!request) return $('askInput').focus();
  $('askBtn').disabled = true;
  $('askBtn').textContent = t('aiReading');
  askStatus(t('askWait'));
  const res = await chrome.runtime.sendMessage({ type: 'EXTRACT', tabId, request });
  $('askBtn').disabled = false;
  $('askBtn').textContent = t('extractTable');
  if (res?.ok) askStatus(t('rowsExtracted', { n: res.count }));
  else askStatus(res?.error || t('somethingWrong'), true);
}

$('askBtn').addEventListener('click', runAsk);
$('askInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAsk(); }
});

$('toggle').addEventListener('click', async () => {
  $('error').hidden = true;
  const res = await chrome.runtime.sendMessage({ type: 'TOGGLE', tabId });
  if (!res?.ok) return showError(res?.error);
  renderToggle(res.active);
  if (res.active) setTimeout(() => window.close(), 350); // get out of the way so the user can pick
});

$('format').addEventListener('click', async (e) => {
  const value = e.target.dataset?.format;
  if (!value) return;
  format = value;
  await chrome.storage.sync.set({ format });
  renderFormat();
});

$('uiLang').addEventListener('click', (e) => {
  const value = e.target.dataset?.lang;
  if (value) chrome.storage.sync.set({ uiLang: value }); // ssI18n.onChange re-renders
});

$('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('shortcut').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes[`active_${tabId}`]) refresh();
});
ssI18n.onChange(renderLanguage);

(async function init() {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
  await ssI18n.init();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  ({ format } = await chrome.storage.sync.get({ format: 'both' }));
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((c) => c.name === 'toggle-picker')?.shortcut;
  shortcutSet = !!shortcut;
  $('shortcut').textContent = shortcut || '';
  renderLanguage();
  await refresh();
})();
