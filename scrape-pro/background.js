// Scrape Pro — background service worker
// Owns: per-tab state, toolbar icon, AI provider calls, the "Extract as table" pipeline, and results tabs.
importScripts('providers.js', 'i18n.js'); // PROVIDERS + translations, shared with the extension pages
const { t } = ssI18n;

const stateKey = (tabId) => `active_${tabId}`;
async function isActive(tabId) {
  const key = stateKey(tabId);
  return (await chrome.storage.session.get(key))[key] ?? false;
}

/* ───────────── Toolbar icon (drawn at runtime, no image files) ───────────── */

// Same geometry as icons/logo.svg (the icons/*.png files are rendered from logoCanvas).
const LOGO_COLORS = {
  active: ['#6D4AFF', '#A78BFA', '#3B1FB0'], // gradient from, gradient to, cursor outline
  inactive: ['#3F4451', '#5B6170', '#262A33'],
};
const LOGO_ROWS = [[0.27, 0.6], [0.43, 0.45], [0.59, 0.52]]; // [top, length as a share of the inner width]; tops are 0.16 apart

function logoCanvas(size, active) {
  const s = size;
  const [from, to, edge] = LOGO_COLORS[active ? 'active' : 'inactive'];
  const canvas = new OffscreenCanvas(s, s);
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, s, s);
  bg.addColorStop(0, from);
  bg.addColorStop(1, to);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, s * 0.26);
  ctx.fill();

  // three table rows; at toolbar sizes they sit on whole pixels (2px bar, 1px gap at 16px) so they stay separate
  const small = s <= 32;
  const bar = small ? Math.round(s * 0.12) : s * 0.1;
  const step = small ? bar + Math.round(s * 0.06) : s * 0.16;
  const top = small ? Math.round(s * 0.27) : s * 0.27;
  ctx.fillStyle = '#FFFFFF';
  LOGO_ROWS.forEach(([, len], i) => {
    const w = small ? Math.round(s * 0.64 * len) : s * 0.64 * len;
    ctx.beginPath();
    ctx.roundRect(small ? Math.round(s * 0.2) : s * 0.2, top + i * step, w, bar, bar / 2);
    ctx.fill();
  });

  // cursor arrow over the bottom-right corner ("click to extract"); the outline is dropped at toolbar sizes
  const a = s * (small ? 0.44 : 0.4);
  const [x, y] = [s * (small ? 0.58 : 0.56), s * 0.5];
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + a);
  ctx.lineTo(x + a * 0.28, y + a * 0.74);
  ctx.lineTo(x + a * 0.68, y + a * 0.72);
  ctx.closePath();
  if (!small) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.045;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
  ctx.fill();
  return canvas;
}

const drawIcon = (size, active) => logoCanvas(size, active).getContext('2d').getImageData(0, 0, size, size);

async function paintIcon(tabId = null, active = false) {
  const scope = tabId != null ? { tabId } : {};
  await chrome.action.setIcon({ ...scope, imageData: { 16: drawIcon(16, active), 32: drawIcon(32, active) } });
  await chrome.action.setBadgeText({ ...scope, text: active ? 'ON' : '' });
  if (active) {
    await chrome.action.setBadgeBackgroundColor({ ...scope, color: '#22C55E' });
    await chrome.action.setBadgeTextColor?.({ ...scope, color: '#FFFFFF' });
  }
  await chrome.action.setTitle({ ...scope, title: active ? 'Scrape Pro: ON' : 'Scrape Pro' });
}

chrome.runtime.onInstalled.addListener(() => {
  paintIcon();
  chrome.storage.sync.remove('snippetLang').catch(() => {}); // pre-1.3.1 scraper language choice; scrapers are Python only now
});
chrome.runtime.onStartup.addListener(() => paintIcon());

/* ───────────────────────── Picker on/off ───────────────────────── */

async function setActive(tabId, active) {
  if (active) {
    // Throws on chrome://, the Web Store, etc. Caller turns that into a friendly message.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['i18n.js', 'content.js'] });
  }
  await chrome.tabs.sendMessage(tabId, { type: 'PICKER_SET', active }).catch(() => {});
  await chrome.storage.session.set({ [stateKey(tabId)]: active });
  await paintIcon(tabId, active);
  return active;
}

const toggle = async (tabId) => setActive(tabId, !(await isActive(tabId)));

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/cannot access|chrome:\/\/|extensions gallery|cannot be scripted|webstore/i.test(msg)) return t('errRestricted');
  return msg;
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-picker' || tab?.id == null) return;
  try { await toggle(tab.id); } catch (err) { console.warn('[Scrape Pro]', friendlyError(err)); }
});

// A page load wipes the content script, so reset that tab's state.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'loading' || !(await isActive(tabId))) return;
  await chrome.tabs.sendMessage(tabId, { type: 'PICKER_SET', active: false }).catch(() => {});
  await chrome.storage.session.set({ [stateKey(tabId)]: false });
  await paintIcon(tabId, false);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(stateKey(tabId));
});

/* ───────────────────────── AI: one function for every provider ───────────────────────── */

async function getAIConfig() {
  const s = await chrome.storage.local.get({ provider: 'zenmux', keys: {}, models: {}, baseUrl: '', apiKey: '', model: '' });
  const p = PROVIDERS[s.provider] || PROVIDERS.custom;
  const legacy = s.provider === 'zenmux'; // settings saved by older versions used a single ZenMux key
  return {
    provider: s.provider,
    format: p.format,
    url: s.provider === 'custom' ? s.baseUrl : p.url,
    apiKey: s.keys[s.provider] || (legacy ? s.apiKey : ''),
    model: s.models[s.provider] || (legacy ? s.model : '') || p.model || '',
    noKey: !!p.noKey,
  };
}

async function callLLM({ system, user, maxTokens = 4000 }) {
  const c = await getAIConfig();
  if (!c.url) return { ok: false, error: t('errNoUrl') };
  if (!c.apiKey && !c.noKey) return { ok: false, error: t('errNoKey') };
  if (!c.model) return { ok: false, error: t('errNoModel') };

  const anthropic = c.format === 'anthropic';
  const headers = { 'content-type': 'application/json' };
  let body;
  if (anthropic) {
    headers['x-api-key'] = c.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    if (c.provider === 'anthropic') headers['anthropic-dangerous-direct-browser-access'] = 'true';
    body = { model: c.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] };
  } else {
    if (c.apiKey) headers.authorization = `Bearer ${c.apiKey}`;
    body = { model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  }

  let res;
  try {
    res = await fetch(c.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  } catch (err) {
    return { ok: false, error: err.name === 'TimeoutError' ? t('errTimeout') : t('errUnreachable', { msg: err.message }) };
  }

  const raw = await res.json().catch(() => ({}));
  const data = Array.isArray(raw) ? raw[0] : raw; // some providers wrap errors in an array
  if (!res.ok) return { ok: false, error: data?.error?.message || t('errApi', { status: res.status }) };

  const text = anthropic
    ? (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    : data.choices?.[0]?.message?.content || '';
  if (!text.trim()) return { ok: false, error: t('errEmpty') };
  return { ok: true, text };
}

/* ───────────────────────── Scraper code for one element ───────────────────────── */

const SYSTEM_PROMPT = `You are a senior web-scraping engineer. You receive one element picked from a live web page: the page URL, a CSS selector, an XPath, and the element's outerHTML. Write a minimal, ready-to-run script that extracts that element's data.

Requirements:
- Respond with exactly one fenced code block and nothing else.
- Put the URL and the CSS selector in constants at the top so they are easy to change.
- Extract what is actually useful in the given HTML: whitespace-normalized text, plus attributes such as href/src/alt/value/datetime/data-* when present. Resolve relative URLs against the page URL.
- If the element is not found, print a clear message and exit with a non-zero code.
- If the selector uses :nth-of-type or :nth-child (it points at one item in a repeated list), also include a clearly commented section that generalizes the selector and extracts ALL sibling items.
- Print results as pretty JSON.
- Keep it short and idiomatic, with brief comments only where they help.`;

// Generated scrapers are Python only
const PYTHON = {
  label: 'Python 3 with requests + BeautifulSoup (bs4)',
  rules: `- First line: # pip install requests beautifulsoup4
- Use requests with a realistic desktop User-Agent, timeout=20, and raise_for_status().
- Decode correctly: parse with BeautifulSoup(response.content, "html.parser") (bytes, not response.text) so the page's declared charset is respected and symbols like £ don't turn into "Â£".
- Locate with soup.select_one(CSS_SELECTOR).
- Add a short comment: if the content is rendered by JavaScript, requests will not see it, so a headless browser (e.g. Playwright for Python) is needed instead.`,
};

function cleanHtml(html, max = 12000) {
  const out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s{2,}/g, ' ');
  return out.length > max
    ? { html: out.slice(0, max) + '\n<!-- …truncated… -->', truncated: true }
    : { html: out, truncated: false };
}

function buildUserPrompt({ outerHTML, css, xpath, url }) {
  const spec = PYTHON;
  const { html, truncated } = cleanHtml(outerHTML);
  return `Target: ${spec.label}
Language-specific rules:
${spec.rules}

Page URL: ${url}
CSS selector: ${css}
XPath: ${xpath}

Element outerHTML${truncated ? ' (truncated)' : ''}:
\`\`\`html
${html}
\`\`\``;
}

async function generateSnippet(payload) {
  const ai = await callLLM({ system: SYSTEM_PROMPT, user: buildUserPrompt(payload), maxTokens: 2500 });
  if (!ai.ok) return ai;
  const match = ai.text.match(/```[\w.+-]*\n([\s\S]*?)```/);
  return { ok: true, code: (match ? match[1] : ai.text.replace(/^```[\w.+-]*\s*\n/, '')).trim() };
}

/* ───────────────────────── Extract as table ─────────────────────────
   The AI only decides WHERE the data is (a "recipe" of selectors).
   The content script then reads the real values from the live page,
   so the AI never writes the data itself and can't invent values.     */

const RECIPE_PROMPT = `You design web data extractions. You receive a simplified HTML snapshot of a web page (scripts and styles removed, long text shortened) and a description of the data the user wants. Return a JSON "recipe" that a program will run on the live page with querySelectorAll.

Respond with ONLY this JSON object: no prose, no code fences.
{
  "title": "short description of the dataset",
  "itemSelector": "CSS selector matching each repeated item (one row per match), or null for a single row from the whole page",
  "fields": [
    {
      "name": "short_snake_case_column_name",
      "selector": "CSS selector relative to the item, or null to use the item itself",
      "attribute": "attribute to read (href, src, alt, title, content, class, data-*) or null for the visible text",
      "regex": "optional JavaScript regex with one capture group applied to the value, or null"
    }
  ]
}

Rules:
- Only use selectors that exist in the snapshot. Prefer stable class names and attributes over positional selectors like :nth-child.
- Include only the fields the user asked for. If the request is vague, choose the 3 to 8 most useful fields.
- For links and images, read href or src.
- If a value is encoded in a class name (for example "star-rating Three"), read the class attribute and use a regex to capture it.
- Never invent values; the program reads them from the page.`;

function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

// What the picked elements mean, so the AI can use them (a typed request always wins)
const PICK_GUIDE = {
  single: () => 'Example element the user picked:',
  items: (n) => `The user picked ${n} similar elements as examples of the repeating pattern. Use them to find itemSelector.`,
  parts: (n) => `The user picked ${n} different parts of one item. Unless the request says otherwise, make each picked part a field, `
    + 'in this order, and use their closest shared repeated container as itemSelector.',
};
const DEFAULT_REQUEST = {
  single: 'Extract all items similar to the example element, with their most useful fields.',
  items: 'Extract all items like the picked examples, with their most useful fields.',
  parts: 'Extract the picked parts from every similar item on the page.',
};

function pickedPrompt(hints, relation) {
  if (!hints.length) return '';
  const guide = (PICK_GUIDE[relation] || PICK_GUIDE.single)(hints.length);
  const list = hints.map((h, i) => `Picked element ${i + 1} (CSS selector: ${h.selector}):\n\`\`\`html\n${h.html}\n\`\`\``);
  return [guide, 'If the user typed a request, it wins over what was picked.', ...list].join('\n\n');
}

function recipeUserPrompt(snap, request, hints, relation, feedback) {
  const language = ssI18n.lang === 'es' ? 'Spanish' : 'English';
  return [
    `Page URL: ${snap.url}`,
    `Page title: ${snap.title}`,
    `Request: ${request || DEFAULT_REQUEST[hints.length && PICK_GUIDE[relation] ? relation : 'single']}`,
    `Write "title" and every field "name" in ${language} (names in snake_case).`,
    pickedPrompt(hints, relation),
    feedback ? `Your previous attempt did not work. ${feedback}` : '',
    `Page snapshot${snap.truncated ? ' (truncated)' : ''}:\n\`\`\`html\n${snap.html}\n\`\`\``,
  ].filter(Boolean).join('\n\n');
}

async function ensureContent(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['i18n.js', 'content.js'] });
  } catch (err) {
    // If the script is already there it still answers; otherwise this page is off-limits.
    const alive = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
    if (!alive) throw err;
  }
}

async function openResults(result, tabId) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await chrome.storage.session.set({ [`results_${id}`]: result });
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`results.html?id=${id}`),
    ...(tab ? { index: tab.index + 1, openerTabId: tabId } : {}),
  });
}

async function extract(tabId, request, hints, relation = 'single') {
  hints = hints || []; // no picks (the popup) is fine
  if (tabId == null) return { ok: false, error: t('errNoTab') };
  try { await ensureContent(tabId); } catch (err) { return { ok: false, error: friendlyError(err) }; }

  const snap = await chrome.tabs.sendMessage(tabId, { type: 'SNAPSHOT' }).catch(() => null);
  if (!snap?.html) return { ok: false, error: t('errUnreadable') };

  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const ai = await callLLM({ system: RECIPE_PROMPT, user: recipeUserPrompt(snap, request, hints, relation, feedback), maxTokens: 2000 });
    if (!ai.ok) return ai;

    const recipe = parseJson(ai.text);
    if (!recipe || !Array.isArray(recipe.fields) || !recipe.fields.length) {
      feedback = `It was not a valid recipe. Reply with the JSON object only.\nPrevious answer: ${ai.text.slice(0, 400)}`;
      continue;
    }

    const run = await chrome.tabs.sendMessage(tabId, { type: 'RUN_RECIPE', recipe }).catch(() => null);
    if (run?.rows?.length && run.filled > 0) {
      await openResults({ recipe, rows: run.rows, columns: run.columns, url: snap.url, pageTitle: snap.title, request }, tabId);
      return { ok: true, count: run.rows.length };
    }
    feedback = run?.error
      ? `Running the recipe failed with: ${run.error}\nRecipe: ${JSON.stringify(recipe)}`
      : `The recipe matched ${run?.matched ?? 0} items and every field was empty. Check the selectors against the snapshot.\nRecipe: ${JSON.stringify(recipe)}`;
  }
  return { ok: false, error: t('errNoMatch') };
}

/* ───────────────────────── Message router ───────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    await ssI18n.init();
    switch (msg?.type) {
      case 'GET_STATE':
        return { active: await isActive(msg.tabId) };
      case 'TOGGLE':
        try { return { ok: true, active: await toggle(msg.tabId) }; }
        catch (err) { return { ok: false, error: friendlyError(err) }; }
      case 'PICKER_EXIT': // user pressed Esc inside the page
        if (sender.tab) {
          await chrome.storage.session.set({ [stateKey(sender.tab.id)]: false });
          await paintIcon(sender.tab.id, false);
        }
        return { ok: true };
      case 'GENERATE_SNIPPET':
        return generateSnippet(msg.payload);
      case 'EXTRACT':
        return extract(msg.tabId ?? sender.tab?.id, msg.request || '', msg.hints || (msg.hint ? [msg.hint] : []), msg.relation);
      case 'TEST_AI': {
        const ai = await callLLM({ system: 'You are a connection test.', user: 'Reply with exactly: OK', maxTokens: 20 });
        return ai.ok ? { ok: true, reply: ai.text.trim().slice(0, 40) } : ai;
      }
      default:
        return { ok: false, error: 'Unknown message' };
    }
  })().then(sendResponse, (err) => sendResponse({ ok: false, error: err.message }));
  return true; // keep the channel open for the async response
});
