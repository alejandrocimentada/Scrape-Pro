const $ = (id) => document.getElementById(id);
const { t } = ssI18n;
let state = { provider: 'zenmux', keys: {}, models: {}, baseUrl: '' };

const providerLabel = (id) => (ssI18n.has(`label_${id}`) ? t(`label_${id}`) : PROVIDERS[id].label);
const providerNote = (id) => (ssI18n.has(`note_${id}`) ? t(`note_${id}`) : PROVIDERS[id].note || '');

function showStatus(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('err', isError);
}

// Remember what was typed for the provider we're switching away from.
function stash() {
  const id = $('provider').dataset.current;
  if (!id) return;
  state.keys[id] = $('apiKey').value.trim();
  state.models[id] = $('model').value.trim();
}

function showProvider() {
  const id = $('provider').value;
  const p = PROVIDERS[id];
  $('provider').dataset.current = id;
  $('apiKey').value = state.keys[id] || '';
  $('apiKey').placeholder = p.keyHint || t('apiKey');
  $('model').value = state.models[id] || p.model || '';
  $('model').placeholder = t('modelPlaceholder');
  $('baseUrl').value = state.baseUrl || '';
  $('baseUrlField').hidden = id !== 'custom';
  $('keyField').hidden = !!p.noKey;
  $('providerNote').textContent = providerNote(id);
  $('providerNote').hidden = !providerNote(id);
}

function renderLanguage() {
  ssI18n.apply(document);
  document.title = `Scrape Pro · ${t('aiProvider')}`;
  for (const opt of $('provider').options) opt.textContent = providerLabel(opt.value);
  $('reveal').textContent = t($('apiKey').type === 'password' ? 'show' : 'hide');
  $('model').placeholder = t('modelPlaceholder');
  $('providerNote').textContent = providerNote($('provider').value);
  showStatus('');
}

async function load() {
  await ssI18n.init();
  const sync = await chrome.storage.sync.get({ format: 'both', uiLang: 'auto' });
  const s = await chrome.storage.local.get({ provider: 'zenmux', keys: {}, models: {}, baseUrl: '', apiKey: '', model: '' });
  // Carry over settings saved by older versions (a single ZenMux key and model)
  if (s.apiKey && !s.keys.zenmux) s.keys.zenmux = s.apiKey;
  if (s.model && !s.models.zenmux) s.models.zenmux = s.model;
  state = s;

  document.querySelector(`input[name="format"][value="${sync.format}"]`).checked = true;
  document.querySelector(`input[name="uiLang"][value="${sync.uiLang}"]`).checked = true;

  const select = $('provider');
  for (const id of Object.keys(PROVIDERS)) select.append(new Option(providerLabel(id), id));
  select.value = PROVIDERS[s.provider] ? s.provider : 'zenmux';
  renderLanguage();
  showProvider();
}

// Validates, asks Chrome for permission to reach the provider, then saves.
// chrome.permissions.request must be called directly inside the click, before any await.
function persist(onSaved) {
  const id = $('provider').value;
  const p = PROVIDERS[id];
  const url = id === 'custom' ? $('baseUrl').value.trim() : p.url;
  let origin;
  try {
    const u = new URL(url);
    origin = `${u.protocol}//${u.hostname}/*`;
  } catch {
    return showStatus(t('invalidUrl'), true);
  }
  if (!p.noKey && !$('apiKey').value.trim()) return showStatus(t('enterKey'), true);
  if (!$('model').value.trim()) return showStatus(t('enterModel'), true);

  chrome.permissions.request({ origins: [origin] }, async (granted) => {
    if (chrome.runtime.lastError || !granted) return showStatus(t('permissionDenied'), true);
    stash();
    state.provider = id;
    state.baseUrl = $('baseUrl').value.trim();
    await chrome.storage.local.set({ provider: id, keys: state.keys, models: state.models, baseUrl: state.baseUrl });
    await chrome.storage.sync.set({
      format: document.querySelector('input[name="format"]:checked').value,
    });
    onSaved();
  });
}

$('provider').addEventListener('change', () => { stash(); showProvider(); showStatus(''); });

$('reveal').addEventListener('click', () => {
  const input = $('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
  $('reveal').textContent = t(input.type === 'password' ? 'show' : 'hide');
});

// Language applies immediately, without pressing Save
document.querySelectorAll('input[name="uiLang"]').forEach((radio) => {
  radio.addEventListener('change', () => chrome.storage.sync.set({ uiLang: radio.value }));
});
ssI18n.onChange(renderLanguage);

$('save').addEventListener('click', () => persist(() => {
  showStatus(t('saved'));
  setTimeout(async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab) chrome.tabs.remove(tab.id);
    else window.close();
  }, 700);
}));

$('test').addEventListener('click', () => persist(async () => {
  showStatus(t('testing'));
  const res = await chrome.runtime.sendMessage({ type: 'TEST_AI' });
  showStatus(res?.ok ? t('connected', { reply: res.reply }) : t('failed', { error: res?.error }), !res?.ok);
}));

load();
