// Scrape Pro — content script (injected on demand by background.js)
(() => {
  if (window.__scrapeProLoaded) return; // guard against double injection
  window.__scrapeProLoaded = true;
  const { t } = self.ssI18n; // translations (i18n.js is injected just before this file)

  /* ───────────────────────── tiny DOM helper ───────────────────────── */
  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    node.append(...kids.filter((k) => k != null));
    return node;
  }

  /* ───────────────────────── selector engine ─────────────────────────
     Priority per element: stable unique id → stable test/form attribute →
     tag or unique class combo → nth-of-type fallback. The path grows upward
     until the full selector matches exactly one element.                   */

  const STABLE_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa', 'name', 'aria-label'];
  const UNSTABLE_PATTERNS = [
    /\d{4,}/,                                   // long numbers: item-839201
    /^[a-z]{1,4}-(?=[a-z0-9]*\d)[a-z0-9]{5,}$/i, // hashed: css-1x9f2k
    /^(css|jsx|sc|emotion|svelte)-/i,           // CSS-in-JS prefixes
    /__(?=[\w-]*\d)[\w-]{4,}$/,                 // CSS modules: Button_root__a1b2c
    /^_(?=\w*\d)\w{5,}$/,                       // _3xk9a2
    /^:r[0-9a-z]*:$/i,                          // React useId
    /^(ember|ext-gen|yui_)/i,                   // framework auto-ids
    /^(is|has)-/i,                              // state classes
    /^(active|hover|focus|focused|selected|open|opened|visible|hidden|show|disabled|current)$/i,
  ];

  const isStable = (token) => !!token && token.length <= 40 && !UNSTABLE_PATTERNS.some((re) => re.test(token));
  const cssCount = (sel) => { try { return document.querySelectorAll(sel).length; } catch { return -1; } };
  const isUnique = (sel) => cssCount(sel) === 1;
  const xpathCount = (xp) => {
    try { return document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength; }
    catch { return -1; }
  };

  function combos(items, maxSize = 3) {
    const out = [];
    const walk = (start, picked) => {
      if (picked.length) out.push([...picked]);
      if (picked.length === maxSize) return;
      for (let i = start; i < items.length; i++) { picked.push(items[i]); walk(i + 1, picked); picked.pop(); }
    };
    walk(0, []);
    return out.sort((a, b) => a.length - b.length); // shortest combos first
  }

  function segmentFor(el) {
    const tag = el.localName;

    if (el.id && isStable(el.id)) {
      const sel = `#${CSS.escape(el.id)}`;
      if (isUnique(sel)) return sel;
    }

    for (const attr of STABLE_ATTRS) {
      const value = el.getAttribute(attr);
      if (value && value.length <= 60) {
        const sel = `${tag}[${attr}="${CSS.escape(value)}"]`;
        if (isUnique(sel)) return sel;
      }
    }

    const classes = Array.from(el.classList).filter(isStable).slice(0, 5);
    const candidates = [tag, ...combos(classes).map((c) => tag + c.map((x) => '.' + CSS.escape(x)).join(''))];

    for (const c of candidates) if (isUnique(c)) return c; // unique on the whole page

    const siblings = el.parentElement ? Array.from(el.parentElement.children) : [el];
    for (const c of candidates) {
      if (siblings.filter((s) => s.matches(c)).length === 1) return c; // unique among siblings
    }

    const sameTag = siblings.filter((s) => s.localName === tag);
    return `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})`;
  }

  function getCssSelector(el) {
    const path = [];
    for (let node = el; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      path.unshift(segmentFor(node));
      const sel = path.join(' > ');
      if (isUnique(sel)) return sel;
    }
    return path.join(' > ');
  }

  const XHTML_NS = 'http://www.w3.org/1999/xhtml';
  function xpathLiteral(s) {
    if (!s.includes('"')) return `"${s}"`;
    if (!s.includes("'")) return `'${s}'`;
    return `concat("${s.split('"').join(`", '"', "`)}")`;
  }

  function getXPath(el) {
    const steps = [];
    for (let node = el; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      if (node.id && isStable(node.id) && isUnique(`#${CSS.escape(node.id)}`)) {
        steps.unshift(`//*[@id=${xpathLiteral(node.id)}]`);
        return steps.join('/');
      }
      const name = node.localName;
      const step = node.namespaceURI === XHTML_NS ? name : `*[local-name()=${xpathLiteral(name)}]`; // SVG/MathML
      const same = node.parentElement
        ? Array.from(node.parentElement.children).filter((s) => s.localName === name)
        : [node];
      steps.unshift(same.length > 1 ? `${step}[${same.indexOf(node) + 1}]` : step);
    }
    return '/' + steps.join('/');
  }

  /* ───────────────────────── page snapshot + recipe runner ───────────────────────── */

  const SNAP_DROP = 'script, style, noscript, svg, iframe, link, meta, template, canvas, video, audio';
  const SNAP_KEEP = new Set(['id', 'class', 'href', 'src', 'alt', 'title', 'name', 'content', 'datetime',
    'aria-label', 'itemprop', 'role', 'type', 'value']);

  // A compact copy of the page for the AI: no scripts or styles, short text, only useful attributes.
  function snapshotOf(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll(SNAP_DROP).forEach((n) => n.remove());
    const comments = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT);
    for (let n = walker.currentNode; n; n = walker.nextNode()) {
      if (n.nodeType === Node.COMMENT_NODE) {
        comments.push(n);
      } else if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent.replace(/\s+/g, ' ');
        n.textContent = t.length > 160 ? t.slice(0, 160) + '…' : t;
      } else {
        for (const { name } of Array.from(n.attributes)) {
          if (!(SNAP_KEEP.has(name) || name.startsWith('data-'))) n.removeAttribute(name);
          else if (n.getAttribute(name).length > 120) n.setAttribute(name, n.getAttribute(name).slice(0, 120));
        }
      }
    }
    comments.forEach((n) => n.remove());
    return clone.outerHTML.replace(/>\s+</g, '><');
  }

  function pageSnapshot(maxChars = 60000) {
    let html = snapshotOf(document.body);
    const main = document.querySelector('main');
    if (html.length > maxChars && main) html = snapshotOf(main); // focus on the main content of big pages
    const truncated = html.length > maxChars;
    return {
      html: truncated ? html.slice(0, maxChars) + '<!-- …truncated… -->' : html,
      truncated,
      url: location.href,
      title: document.title,
    };
  }

  function readField(item, f) {
    const el = f.selector ? item.querySelector(f.selector) : item;
    if (!el) return '';
    let value;
    const attr = f.attribute;
    if (!attr) value = (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
    else if ((attr === 'href' || attr === 'src') && typeof el[attr] === 'string' && el[attr]) value = el[attr]; // absolute URL
    else value = el.getAttribute(attr) ?? '';
    if (f.regex) {
      try {
        const m = String(value).match(new RegExp(f.regex));
        value = m ? (m[1] ?? m[0]) : '';
      } catch { /* invalid regex from the AI: keep the raw value */ }
    }
    return value;
  }

  // Runs the AI's recipe on the live page. Every value comes from the DOM, not from the AI.
  function runRecipe(recipe) {
    try {
      const items = recipe.itemSelector
        ? Array.from(document.querySelectorAll(recipe.itemSelector))
        : [document.documentElement];
      const seen = new Map();
      const fields = (recipe.fields || []).filter((f) => f && f.name).map((f) => {
        const base = String(f.name).trim() || 'field';
        const n = (seen.get(base) || 0) + 1;
        seen.set(base, n);
        return { ...f, name: n > 1 ? `${base}_${n}` : base };
      });
      const rows = items.slice(0, 5000).map((item) => Object.fromEntries(fields.map((f) => [f.name, readField(item, f)])));
      const filled = rows.reduce((sum, r) => sum + Object.values(r).filter((v) => v !== '').length, 0);
      return { rows, columns: fields.map((f) => f.name), matched: items.length, filled };
    } catch (err) {
      return { error: err.message };
    }
  }

  /* ───────────────────────── UI (Shadow DOM) ───────────────────────── */

  const STYLES = `
    :host { all: initial; }
    [hidden] { display: none !important; }
    .box { position: fixed; top: 0; left: 0; pointer-events: none; border-radius: 6px; opacity: 0;
      transition: top 90ms ease-out, left 90ms ease-out, width 90ms ease-out, height 90ms ease-out, opacity 120ms; }
    .box.show { opacity: 1; }
    .box.hover { border: 2px solid #7C5CFF; background: rgba(124,92,255,.10); box-shadow: 0 0 0 4px rgba(124,92,255,.18); }
    .box.hover.adding { border-style: dashed; }
    .box.selected { border: 2px solid #22C55E; background: rgba(34,197,94,.10); box-shadow: 0 0 0 4px rgba(34,197,94,.18); }
    .tag { position: absolute; left: -2px; bottom: calc(100% + 6px); max-width: 420px; padding: 4px 8px; border-radius: 6px;
      background: #7C5CFF; color: #fff; font: 600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
    .tag.inside { bottom: auto; top: 4px; left: 4px; }
    .tag .dim { font-weight: 400; opacity: .8; margin-left: 8px; }

    .pill { position: fixed; right: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      border-radius: 999px; background: rgba(17,19,26,.92); color: #E6E8EE; border: 1px solid rgba(255,255,255,.08);
      font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,.3);
      pointer-events: none; }
    .pill .muted { color: #9AA0AE; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; animation: pulse 1.6s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); } 70%, 100% { box-shadow: 0 0 0 8px rgba(34,197,94,0); } }

    .toast { position: fixed; width: 400px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px); overflow: auto;
      padding: 14px; border-radius: 14px; background: rgba(17,19,26,.97); color: #E6E8EE; color-scheme: dark;
      border: 1px solid rgba(255,255,255,.08); box-shadow: 0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(124,92,255,.25);
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; cursor: default; animation: pop 140ms ease-out; }
    @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(.98); } }
    .head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .title { flex: 1; font-weight: 600; }
    .chip { font: 600 11px/1 ui-monospace, Menlo, Consolas, monospace; color: #C4B5FD; background: rgba(124,92,255,.16);
      padding: 4px 6px; border-radius: 6px; }
    .icon { all: unset; cursor: pointer; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px; color: #9AA0AE; }
    .icon:hover { background: rgba(255,255,255,.08); color: #fff; }
    .row { margin-bottom: 10px; }
    .row-head { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;
      text-transform: uppercase; letter-spacing: .06em; color: #9AA0AE; }
    .ok { color: #4ADE80; } .warn { color: #FBBF24; }
    .row-body { display: flex; gap: 6px; }
    code.sel { flex: 1; min-width: 0; padding: 8px 10px; border-radius: 8px; background: #0B0D12; border: 1px solid rgba(255,255,255,.06);
      color: #E6E8EE; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; overflow-x: auto; }
    .btn { all: unset; box-sizing: border-box; cursor: pointer; padding: 0 12px; min-height: 32px; display: inline-flex;
      align-items: center; justify-content: center; border-radius: 8px; background: rgba(255,255,255,.08); color: #E6E8EE;
      font: 600 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; transition: background 120ms, transform 80ms; }
    .btn:hover { background: rgba(255,255,255,.14); }
    .btn:active { transform: scale(.97); }
    .btn.done { background: rgba(34,197,94,.2); color: #4ADE80; }
    .btn.primary { flex: 1; background: linear-gradient(135deg, #7C5CFF, #A78BFA); color: #fff; }
    .btn.primary:hover { filter: brightness(1.08); }
    .btn[disabled] { opacity: .7; cursor: progress; }
    .ai { margin-top: 4px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.08); }
    .ai-label { margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #9AA0AE; }
    .ai-row { display: flex; gap: 6px; }
    .ai-out { margin-top: 10px; border-radius: 10px; overflow: hidden; background: #0B0D12; border: 1px solid rgba(255,255,255,.08); }
    .ai-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 6px 6px 10px; color: #9AA0AE;
      font: 11px ui-monospace, Menlo, Consolas, monospace; border-bottom: 1px solid rgba(255,255,255,.06); }
    .ai-bar .btn { min-height: 26px; }
    pre { margin: 0; padding: 10px; max-height: 320px; overflow: auto; }
    pre code { font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #D6DAE3; white-space: pre; }
    .skeleton { height: 120px; background: linear-gradient(90deg, #0B0D12 0%, #1C1F2B 50%, #0B0D12 100%);
      background-size: 200% 100%; animation: shimmer 1.1s linear infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    .error { padding: 10px; color: #FCA5A5; font-size: 12px; }
    .ai + .ai { margin-top: 12px; }
    .ai-row + .ai-row { margin-top: 6px; }
    .ask { flex: 1; min-width: 0; min-height: 34px; padding: 0 10px; border-radius: 8px; background: #0B0D12; color: #E6E8EE;
      border: 1px solid rgba(255,255,255,.12); font: 12px system-ui, sans-serif; }
    .ask:focus { outline: 2px solid rgba(124,92,255,.5); border-color: #7C5CFF; }
    .btn.alt { flex: 1; background: rgba(124,92,255,.16); color: #C4B5FD; }
    .btn.alt:hover { background: rgba(124,92,255,.26); }
    .ok-msg { padding: 8px 2px 0; color: #4ADE80; font-size: 12px; }
    .linkbtn { all: unset; cursor: pointer; padding: 3px 6px; border-radius: 6px; font: 600 11px system-ui, sans-serif; color: #A78BFA; }
    .linkbtn:hover { background: rgba(124,92,255,.14); }
    .details { margin-bottom: 4px; }
    .hint { display: flex; align-items: center; gap: 8px; margin: -4px 0 10px; font-size: 11.5px; color: #9AA0AE; }
    .btn.small { min-height: 26px; padding: 0 10px; font-size: 11.5px; }
    .btn.on { background: rgba(34,197,94,.2); color: #4ADE80; }
  `;

  const host = document.createElement('scrape-pro');
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(STYLES); // constructable sheets aren't blocked by page CSP
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    shadow.append(h('style', { text: STYLES }));
  }

  const hoverTag = h('div', { class: 'tag' });
  const hoverBox = h('div', { class: 'box hover' }, hoverTag);
  const pillHint = h('span', { class: 'muted' });
  const pill = h('div', { class: 'pill' }, h('span', { class: 'dot' }), h('b', { text: 'Scrape Pro' }), pillHint);
  const toast = h('div', { class: 'toast' });
  toast.hidden = true;
  shadow.append(hoverBox, pill, toast); // green boxes (one per selected element) are added as needed

  // Keep clicks/keys inside our UI from bubbling out to the page's handlers.
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown', 'keyup', 'keypress']
    .forEach((t) => shadow.addEventListener(t, (e) => e.stopPropagation()));

  let cursorSheet = null;
  try {
    cursorSheet = new CSSStyleSheet();
    cursorSheet.replaceSync('*, *::before, *::after { cursor: crosshair !important; }');
  } catch { cursorSheet = null; }

  /* ───────────────────────── state ───────────────────────── */
  let active = false;
  let hovered = null;
  let selection = [];   // picked elements, in the order they were picked
  let current = null;   // { el, css, xpath } of the most recent pick: the card follows it and Details describe it
  let ctrlDown = false; // Ctrl (or Cmd on Mac) held = add/remove mode
  let addMode = false;  // touch screens have no Ctrl: the card's "+ Add more" toggle stands in for it
  let anchor = { x: 0, y: 0 };
  let raf = 0;
  let settings = { format: 'both', showDetails: false };
  const selectBoxes = [];
  const touchScreen = matchMedia('(any-pointer: coarse)').matches;

  const locked = () => selection.length > 0;
  const adding = () => ctrlDown || addMode;
  const hoverAllowed = () => !locked() || adding(); // no hover outline while something is selected, unless adding

  chrome.storage.sync.get(settings).then((s) => { settings = s; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [k, { newValue }] of Object.entries(changes)) settings[k] = newValue;
    if (changes.format && current && !toast.hidden) renderToast();
  });
  ssI18n.init().then(updatePill);
  ssI18n.onChange(() => {
    updatePill();
    if (current && !toast.hidden) renderToast();
  });

  /* ───────────────────────── painting ───────────────────────── */
  const inUI = (e) => e.composedPath().includes(host);

  function describe(el) {
    let s = el.localName;
    if (el.id) s += '#' + el.id;
    const cls = Array.from(el.classList).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    return s;
  }

  function place(box, el) {
    if (!el || !el.isConnected) { box.classList.remove('show'); return null; }
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
    box.classList.add('show');
    return r;
  }

  function paint() {
    // Violet hover box: dashed "+ add" / "− remove" while adding to a selection
    const r = place(hoverBox, hovered && hoverAllowed() ? hovered : null);
    if (r) {
      const prefix = !locked() ? '' : `${t(selection.includes(hovered) ? 'removeLabel' : 'addLabel')}  `;
      hoverTag.replaceChildren(document.createTextNode(prefix + describe(hovered)),
        h('span', { class: 'dim', text: `${Math.round(r.width)}×${Math.round(r.height)}` }));
      hoverTag.classList.toggle('inside', r.top < 28);
      hoverBox.classList.toggle('adding', locked());
    }
    // One green box per selected element
    while (selectBoxes.length < selection.length) {
      const box = h('div', { class: 'box selected' });
      shadow.insertBefore(box, hoverBox);
      selectBoxes.push(box);
    }
    selectBoxes.forEach((box, i) => place(box, selection[i] || null));
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); });
  }

  function updatePill() {
    pillHint.textContent = t(locked() ? 'pickerHintLocked' : 'pickerHint');
  }

  /* ───────────────────────── toast ───────────────────────── */
  // Next to the most recent pick, inside the window, never covering a selected element (falls back to the click point)
  function positionToast() {
    const pad = 12, gap = 14;
    const { width: w, height: ht } = toast.getBoundingClientRect();
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
    const around = (r) => [
      { x: r.right + gap, y: clamp(r.top, pad, innerHeight - ht - pad) }, { x: r.left - gap - w, y: clamp(r.top, pad, innerHeight - ht - pad) },
      { x: clamp(r.left, pad, innerWidth - w - pad), y: r.bottom + gap }, { x: clamp(r.left, pad, innerWidth - w - pad), y: r.top - gap - ht },
    ];
    const free = (s, rects) => s.x >= pad && s.y >= pad && s.x + w <= innerWidth - pad && s.y + ht <= innerHeight - pad
      && !rects.some((b) => s.x < b.right && s.x + w > b.left && s.y < b.bottom && s.y + ht > b.top);
    // First keep each pick's container clear (so its neighbours stay pickable), then just the picks themselves
    const container = (el) => {
      const b = el.parentElement?.getBoundingClientRect();
      return b && b.width * b.height < innerWidth * innerHeight * 0.25 ? el.parentElement : el;
    };
    const rectOf = (el) => el.getBoundingClientRect();
    let spot = null;
    if (current?.el.isConnected) {
      for (const pick of [container, (el) => el]) {
        spot ||= around(rectOf(pick(current.el))).find((s) => free(s, selection.map((el) => rectOf(pick(el)))));
      }
    }
    if (!spot) { // crowded page or a huge selection: next to the click point, flipped to stay on screen
      let x = anchor.x + gap, y = anchor.y + gap;
      if (x + w > innerWidth - pad) x = anchor.x - w - gap;
      if (y + ht > innerHeight - pad) y = innerHeight - ht - pad;
      spot = { x: Math.max(pad, x), y: Math.max(pad, y) };
    }
    toast.style.left = `${spot.x}px`;
    toast.style.top = `${spot.y}px`;
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea'); // fallback for http pages / strict permissions policies
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const prev = btn.textContent;
    btn.textContent = t('copied');
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = prev; btn.classList.remove('done'); }, 1200);
  }

  function selectorRow(label, value, matches) {
    const badge = matches === 1
      ? h('span', { class: 'ok', text: t('unique') })
      : h('span', { class: 'warn', text: matches < 1 ? t('noMatch') : t('matches', { n: matches }) });
    const btn = h('button', { class: 'btn', text: t('copy') });
    btn.addEventListener('click', () => copy(value, btn));
    return h('div', { class: 'row' },
      h('div', { class: 'row-head' }, h('span', { text: label }), badge),
      h('div', { class: 'row-body' }, h('code', { class: 'sel', text: value, title: value }), btn));
  }

  // Shows + copies the full HTML of the selected element (including everything nested inside)
  function htmlRow(el) {
    const html = el.outerHTML;
    const nested = el.querySelectorAll('*').length;
    const btn = h('button', { class: 'btn', text: t('copyHtml') });
    btn.addEventListener('click', () => copy(html, btn));
    const preview = html.replace(/\s+/g, ' ').slice(0, 140) + (html.length > 140 ? '…' : '');
    return h('div', { class: 'row' },
      h('div', { class: 'row-head' },
        h('span', { text: t('elementHtml') }),
        h('span', { class: 'muted', text: t('nestedInfo', { n: nested, kb: (html.length / 1024).toFixed(1) }) })),
      h('div', { class: 'row-body' },
        h('code', { class: 'sel', text: preview, title: t('htmlTitle') }),
        btn));
  }

  // Message the service worker; a reloaded extension becomes a readable error instead of a throw.
  function send(msg) {
    try {
      return chrome.runtime.sendMessage(msg).catch((err) => ({
        ok: false,
        error: /context invalidated/i.test(err.message) ? t('lostConnection') : err.message,
      }));
    } catch {
      disable(); // this copy of the script is orphaned (the extension was reloaded)
      return Promise.resolve({ ok: false, error: t('lostConnection') });
    }
  }

  function renderToast() {
    if (!current) return;
    const { el, css, xpath } = current;
    const n = selection.length;

    // Technical details (selectors + HTML) of the most recent pick, hidden by default; the choice is remembered
    const details = h('div', { class: 'details' });
    if (settings.format !== 'xpath') details.append(selectorRow(t('cssSelector'), css, cssCount(css)));
    if (settings.format !== 'css') details.append(selectorRow(t('xpath'), xpath, xpathCount(xpath)));
    details.append(htmlRow(el));
    details.hidden = !settings.showDetails;
    const detailsBtn = h('button', { class: 'linkbtn', text: t(settings.showDetails ? 'hideDetails' : 'details') });
    detailsBtn.addEventListener('click', () => {
      settings.showDetails = !settings.showDetails;
      details.hidden = !settings.showDetails;
      detailsBtn.textContent = t(settings.showDetails ? 'hideDetails' : 'details');
      try { chrome.storage.sync.set({ showDetails: settings.showDetails }); } catch { /* extension reloaded */ }
      positionToast();
    });

    // Multi-select: Ctrl+click on desktop, a toggle on touch screens
    const hint = h('div', { class: 'hint' });
    if (touchScreen) {
      const addBtn = h('button', { class: `btn small${addMode ? ' on' : ''}`, text: t(addMode ? 'addingOn' : 'addMore') });
      addBtn.addEventListener('click', () => {
        addMode = !addMode;
        addBtn.classList.toggle('on', addMode);
        addBtn.textContent = t(addMode ? 'addingOn' : 'addMore');
        schedule();
      });
      hint.append(addBtn);
    } else {
      hint.textContent = t('multiHint');
    }

    // Extract data: the AI finds the pattern, the page supplies the values
    const askInput = h('input', { class: 'ask', type: 'text', placeholder: t('extractPlaceholder') });
    const extractBtn = h('button', { class: 'btn primary', text: t('extractSimilar') });
    const extractMsg = h('div', { class: 'error' });
    extractMsg.hidden = true;
    extractBtn.addEventListener('click', () => extractTable(askInput.value, extractBtn, extractMsg));
    askInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') extractBtn.click(); });

    // Scraper code
    const output = h('div', { class: 'ai-out' });
    output.hidden = true;
    const genBtn = h('button', { class: 'btn alt', text: t('generateCode') });
    genBtn.addEventListener('click', () => generate(genBtn, output));

    toast.replaceChildren(
      h('div', { class: 'head' },
        h('span', { class: 'chip', text: `<${el.localName}>${n > 1 ? ` +${n - 1}` : ''}` }),
        h('span', { class: 'title', text: n > 1 ? t('elementsSelected', { n }) : t('elementSelected') }),
        detailsBtn,
        h('button', { class: 'icon', title: t('close'), text: '✕', onclick: clearSelection })),
      hint,
      details,
      h('div', { class: 'ai' },
        h('div', { class: 'ai-label', text: t('extractData') }),
        h('div', { class: 'ai-row' }, askInput),
        h('div', { class: 'ai-row' }, extractBtn),
        extractMsg),
      h('div', { class: 'ai' },
        h('div', { class: 'ai-label', text: t('scraperCode') }),
        h('div', { class: 'ai-row' }, genBtn),
        output));
    toast.hidden = false;
    positionToast();
  }

  const inDocOrder = (els) => [...els].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const signature = (el) => el.localName + Array.from(el.classList).filter(isStable).sort().map((c) => `.${c}`).join('');

  // How the picks relate: one element, several similar ones (examples of the repeated item),
  // or different parts of an item (the columns the visitor wants)
  function relationOf(els) {
    if (els.length < 2) return 'single';
    return els.every((el) => signature(el) === signature(els[0])) ? 'items' : 'parts';
  }

  async function extractTable(request, btn, msg) {
    if (!current) return;
    const picks = inDocOrder(selection);
    const budget = Math.floor(6000 / picks.length);
    btn.disabled = true;
    btn.textContent = t('aiReading');
    msg.hidden = true;
    const res = await send({
      type: 'EXTRACT',
      request: request.trim(),
      hints: picks.map((el) => ({ selector: getCssSelector(el), html: el.outerHTML.slice(0, budget) })),
      relation: relationOf(picks),
    });
    btn.disabled = false;
    btn.textContent = t('extractSimilar');
    if (res?.ok) {
      msg.className = 'ok-msg';
      msg.textContent = t('rowsExtractedTab', { n: res.count });
    } else {
      msg.className = 'error';
      msg.textContent = res?.error || t('lostConnection');
    }
    msg.hidden = false;
    positionToast();
  }

  async function generate(btn, output) {
    const target = current;
    if (!target) return;
    btn.disabled = true;
    btn.textContent = t('askingAi');
    output.hidden = false;
    output.replaceChildren(h('div', { class: 'skeleton' }));
    positionToast();
    try {
      const res = await send({
        type: 'GENERATE_SNIPPET',
        payload: { outerHTML: target.el.outerHTML, css: target.css, xpath: target.xpath, url: location.href },
      });
      if (!res) throw new Error(t('lostConnection'));
      if (!res.ok) throw new Error(res.error);
      const copyBtn = h('button', { class: 'btn', text: t('copyCode') });
      copyBtn.addEventListener('click', () => copy(res.code, copyBtn));
      output.replaceChildren(
        h('div', { class: 'ai-bar' }, h('span', { text: 'scrape.py' }), copyBtn),
        h('pre', {}, h('code', { text: res.code })));
    } catch (err) {
      output.replaceChildren(h('div', { class: 'error', text: err.message }));
    } finally {
      btn.disabled = false;
      btn.textContent = t('regenerate');
      positionToast();
    }
  }

  /* ───────────────────────── selection ───────────────────────── */
  function commit(x, y) {
    if (!selection.length) return clearSelection();
    const el = selection[selection.length - 1];
    if (current?.el !== el) current = { el, css: getCssSelector(el), xpath: getXPath(el) };
    if (x != null) anchor = { x, y };
    renderToast();
    updatePill();
    schedule();
  }

  function selectOnly(el, x, y) {
    if (!(el instanceof Element) || el === host) return;
    selection = [el];
    commit(x, y);
  }

  function toggleSelect(el, x, y) {
    if (!(el instanceof Element) || el === host) return;
    if (selection.includes(el)) {
      selection = selection.filter((s) => s !== el);               // Ctrl+click a green element = remove it
    } else if (selection.some((s) => s.contains(el))) {
      return;                                                       // already inside a selected element: ignore
    } else {
      selection = [...selection.filter((s) => !el.contains(s)), el]; // a parent replaces its selected children
    }
    commit(x, y);
  }

  function clearSelection() {
    selection = [];
    current = null;
    addMode = false;
    toast.hidden = true;
    updatePill();
    schedule();
  }

  /* ───────────────────────── event handlers ───────────────────────── */
  function onMove(e) {
    if (!chrome.runtime?.id) return disable(); // the extension was reloaded: shut this orphaned copy down
    if (inUI(e)) return;
    const multi = e.ctrlKey || e.metaKey;
    if (multi !== ctrlDown) { ctrlDown = multi; schedule(); }
    if (e.target instanceof Element && e.target !== hovered) {
      hovered = e.target;
      schedule();
    }
  }

  function onClick(e) {
    if (inUI(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // stop links, buttons, and page handlers from firing
    const el = e.target instanceof Element ? e.target : hovered;
    if (e.ctrlKey || e.metaKey || (addMode && locked())) toggleSelect(el, e.clientX, e.clientY);
    else if (locked()) clearSelection(); // a plain click on the page clears the selection
    else selectOnly(el, e.clientX, e.clientY);
  }

  function block(e) {
    if (inUI(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function onKey(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      if (!ctrlDown) { ctrlDown = true; schedule(); }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      locked() ? clearSelection() : exitPicker();
      return;
    }
    if (inUI(e) || e.altKey || !hovered || !hoverAllowed()) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      const r = hovered.getBoundingClientRect();
      const x = Math.max(0, r.left);
      const y = Math.min(Math.max(0, r.bottom), innerHeight - 20);
      locked() ? toggleSelect(hovered, x, y) : selectOnly(hovered, x, y);
      return;
    }
    const next = e.key === 'ArrowUp' ? hovered.parentElement
      : e.key === 'ArrowDown' ? hovered.firstElementChild
      : null;
    if (next && next !== document.documentElement) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hovered = next;
      schedule();
    }
  }

  function onKeyUp(e) {
    if (e.key === 'Control' || e.key === 'Meta') { ctrlDown = false; schedule(); }
  }

  function onBlur() {
    ctrlDown = false;
    schedule();
  }

  const BLOCKED = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'auxclick'];
  const listeners = [
    ['mousemove', onMove, { capture: true, passive: true }],
    ['click', onClick, true],
    ['keydown', onKey, true],
    ['keyup', onKeyUp, true],
    ['blur', onBlur, false],
    ['scroll', schedule, { capture: true, passive: true }],
    ['resize', schedule, { passive: true }],
    ...BLOCKED.map((t) => [t, block, true]),
  ];

  function enable() {
    if (active) return;
    active = true;
    document.documentElement.appendChild(host);
    updatePill();
    listeners.forEach(([type, fn, opts]) => window.addEventListener(type, fn, opts));
    if (cursorSheet) {
      try { document.adoptedStyleSheets = [...document.adoptedStyleSheets, cursorSheet]; } catch {}
    }
  }

  function disable() {
    if (!active) return;
    active = false;
    listeners.forEach(([type, fn, opts]) => window.removeEventListener(type, fn, opts));
    if (cursorSheet) {
      try { document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== cursorSheet); } catch {}
    }
    hovered = current = null;
    selection = [];
    ctrlDown = addMode = false;
    toast.hidden = true;
    hoverBox.classList.remove('show');
    selectBoxes.forEach((box) => box.classList.remove('show'));
    host.remove();
  }

  function exitPicker() {
    disable();
    try { chrome.runtime.sendMessage({ type: 'PICKER_EXIT' }).catch(() => {}); } catch { /* extension reloaded */ }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'PICKER_SET') (msg.active ? enable() : disable());
    else if (msg?.type === 'PING') sendResponse({ ok: true });
    else if (msg?.type === 'SNAPSHOT') sendResponse(pageSnapshot());
    else if (msg?.type === 'RUN_RECIPE') sendResponse(runRecipe(msg.recipe));
  });
})();
