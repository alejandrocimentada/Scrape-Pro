// Scrape Pro landing page: an interactive copy of the extension, running on a mock supermarket page.
// The AI step is simulated with keyword matching, but like the real extension, every value in the
// table is read from the page's DOM (textContent / href), never from a hard-coded list.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const demo = $('#demo');
  const page = $('#page');
  const shop = $('.shop', page);
  const resultsView = $('#results');
  const extBtn = $('#ext');
  const tabPage = $('#tabPage');
  const tabResults = $('#tabResults');
  const { t } = window.spI18n; // English / Spanish texts (i18n.js)
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = matchMedia('(hover: hover)').matches;
  const KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ Cmd' : 'Ctrl'; // the add/remove key, as the visitor knows it
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    node.append(...kids.filter((k) => k != null));
    return node;
  }

  const state = {
    on: false, hovered: null, card: null, view: 'page',
    selection: [], latest: null, ctrl: false, addMode: false, // picks in pick order; the card follows the latest
    asked: false, coachDone: false, run: 0, data: null, sortCol: null, sortDir: 1,
  };

  /* ───────────── picker outlines ───────────── */
  const hoverTag = h('span', { class: 'pick-tag' });
  const hoverBox = h('div', { class: 'pick-box hover' }, hoverTag);
  page.append(hoverBox);
  const selectBoxes = []; // one green outline per selected element

  const locked = () => state.selection.length > 0;
  const adding = () => state.ctrl || state.addMode;
  const hoverAllowed = () => state.on && (!locked() || adding()); // no hover outline while something is selected, unless adding

  // Where an element sits inside the scrolling mock page (content coordinates)
  function boxOf(el) {
    const r = el.getBoundingClientRect();
    const p = page.getBoundingClientRect();
    return { left: r.left - p.left + page.scrollLeft, top: r.top - p.top + page.scrollTop, width: r.width, height: r.height };
  }

  function place(box, el) {
    if (!el) { box.classList.remove('show'); return null; }
    const b = boxOf(el);
    Object.assign(box.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    box.classList.add('show');
    return b;
  }

  const describe = (el) => el.localName + (el.classList[0] ? `.${el.classList[0]}` : '');

  function paint() {
    while (selectBoxes.length < state.selection.length) {
      const box = h('div', { class: 'pick-box selected' });
      page.insertBefore(box, hoverBox);
      selectBoxes.push(box);
    }
    selectBoxes.forEach((box, i) => place(box, state.selection[i] || null));
    const b = place(hoverBox, hoverAllowed() ? state.hovered : null);
    if (!b) return;
    // While adding to a selection the outline is dashed and says what a Ctrl+click will do
    const action = locked() ? `${t(state.selection.includes(state.hovered) ? 'removeLabel' : 'addLabel')} · ` : '';
    hoverBox.classList.toggle('adding', locked());
    hoverTag.textContent = `${action}${describe(state.hovered)} · ${Math.round(b.width)}×${Math.round(b.height)}`;
    // Keep the label inside the mock page: inside the outline near the top edge, nudged left near the right edge
    const inside = b.top - page.scrollTop < 24;
    hoverTag.classList.toggle('inside', inside);
    const base = inside ? 3 : -2;
    const overflow = b.left + base + hoverTag.offsetWidth - (page.scrollLeft + page.clientWidth - 4);
    hoverTag.style.left = overflow > 0 ? `${base - overflow}px` : '';
  }

  /* ───────────── CSS selector for the picked element (same idea as the extension) ───────────── */
  const count = (sel) => page.querySelectorAll(sel).length;

  function segment(el) {
    const tag = el.localName;
    const candidates = [tag, ...Array.from(el.classList, (c) => `${tag}.${CSS.escape(c)}`)];
    for (const c of candidates) if (count(c) === 1) return c; // unique on the page
    const siblings = Array.from(el.parentElement.children);
    for (const c of candidates) if (siblings.filter((s) => s.matches(c)).length === 1) return c; // unique among siblings
    return `${tag}:nth-of-type(${siblings.filter((s) => s.localName === tag).indexOf(el) + 1})`;
  }

  function cssSelector(el) {
    const path = [];
    for (let node = el; node && node !== page; node = node.parentElement) {
      path.unshift(segment(node));
      if (count(path.join(' > ')) === 1) break;
    }
    return path.join(' > ');
  }

  /* ───────────── picker on/off, selection, and the Scrape Pro card ───────────── */
  function renderExt() {
    const onPage = state.view === 'page';
    extBtn.classList.toggle('on', state.on && onPage);
    extBtn.setAttribute('aria-pressed', String(state.on));
    extBtn.disabled = !onPage;
    extBtn.title = t(onPage ? 'extTitle' : 'extDisabled');
    $('.badge', extBtn).hidden = !(state.on && onPage);
    page.classList.toggle('picking', state.on);
  }

  function setPicker(on) {
    state.on = on;
    if (!on) { state.hovered = null; closeCard(); }
    renderExt();
    paint();
    coach();
  }

  function commit() {
    if (!locked()) return closeCard();
    state.latest = state.selection[state.selection.length - 1];
    paint();
    openCard(state.latest);
    coach();
  }

  function selectOnly(el) {
    state.selection = [el];
    state.hovered = el;
    commit();
  }

  function toggleSelect(el) {
    const sel = state.selection;
    if (sel.includes(el)) state.selection = sel.filter((s) => s !== el); // Ctrl+click a green element = remove it
    else if (sel.some((s) => s.contains(el))) return;                    // already inside a selected element: ignore
    else state.selection = [...sel.filter((s) => !el.contains(s)), el];  // a parent replaces its selected children
    commit();
  }

  function closeCard() { // clears the whole selection
    state.run++; // cancels an extraction in progress
    Object.assign(state, { selection: [], latest: null, asked: false, addMode: false });
    state.card?.remove();
    state.card = null;
    paint();
    coach();
  }

  function openCard(el) {
    const typed = state.card ? $('.sp-input', state.card).value : '';
    state.card?.remove();
    const n = state.selection.length;
    const css = cssSelector(el);
    const matches = count(css);
    const copyBtn = h('button', { class: 'sp-btn', type: 'button', text: t('copy') });
    copyBtn.addEventListener('click', async () => { await copyText(css); flash(copyBtn, t('copied')); });
    const details = h('div', { class: 'sp-details' },
      h('div', { class: 'sp-row-head' }, h('span', { text: t('cssSelector') }),
        h('span', { class: matches === 1 ? 'ok' : 'warn', text: matches === 1 ? t('unique') : t('matches', { n: matches }) })),
      h('div', { class: 'sp-row' }, h('code', { text: css, title: css }), copyBtn));
    details.hidden = true;
    const detailsBtn = h('button', { class: 'lnk', type: 'button', text: t('details'), 'aria-expanded': 'false' });
    detailsBtn.addEventListener('click', () => {
      details.hidden = !details.hidden;
      detailsBtn.textContent = t(details.hidden ? 'details' : 'hideDetails');
      detailsBtn.setAttribute('aria-expanded', String(!details.hidden));
      positionCard();
      coach();
    });

    // Multi-select: Ctrl/Cmd+click on desktop, a toggle on touch screens (no Ctrl there)
    const hint = h('div', { class: 'sp-hint' });
    if (canHover) hint.textContent = t('multiHint', { key: KEY });
    else {
      const addBtn = h('button', { class: `sp-btn small${state.addMode ? ' on' : ''}`, type: 'button', text: t(state.addMode ? 'addingOn' : 'addMore') });
      addBtn.addEventListener('click', () => {
        state.addMode = !state.addMode;
        addBtn.classList.toggle('on', state.addMode);
        addBtn.textContent = t(state.addMode ? 'addingOn' : 'addMore');
      });
      hint.append(addBtn);
    }

    const input = h('input', { class: 'sp-input', type: 'text', placeholder: t('extractPlaceholder'), 'aria-label': t('extractAria') });
    input.value = typed;
    const go = h('button', { class: 'sp-btn primary', type: 'button', text: t('extractSimilar'), title: t('simulatedAi') });
    const msg = h('div', { class: 'sp-msg' });
    msg.hidden = true;
    const markAsked = () => { if (!state.asked) { state.asked = true; coach(); } };
    input.addEventListener('input', markAsked);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
    go.addEventListener('focus', markAsked);
    go.addEventListener('click', () => extract(input.value.trim(), go, msg));

    state.card = h('div', { class: 'sp-card', role: 'dialog', 'aria-label': 'Scrape Pro' },
      h('div', { class: 'sp-head' },
        h('span', { class: 'chip', text: `<${el.localName}>${n > 1 ? ` +${n - 1}` : ''}` }),
        h('b', { text: n > 1 ? t('elementsSelected', { n }) : t('elementSelected') }),
        detailsBtn,
        h('button', { class: 'x', type: 'button', title: t('close'), 'aria-label': t('close'), text: '✕', onclick: closeCard })),
      hint,
      details,
      h('div', { class: 'sp-sec' }, h('div', { class: 'sp-label', text: t('extractData') }), input, go, msg),
      h('div', { class: 'sp-sec' }, h('div', { class: 'sp-label', text: t('scraperCode') }),
        h('button', { class: 'sp-btn alt', type: 'button', 'aria-disabled': 'true', title: t('inExtension'), text: t('generateCode') })));
    page.append(state.card);
    positionCard();
  }

  // Next to the selection, inside the mock page, never covering the selected element
  function positionCard() {
    const card = state.card;
    if (!card || !state.latest) return;
    const pad = 8, gap = 10;
    card.style.maxHeight = `${page.clientHeight - 2 * pad}px`; // a tall card scrolls instead of leaving the view
    const w = card.offsetWidth, ht = card.offsetHeight;
    const W = page.clientWidth, H = Math.max(shop.offsetHeight, page.clientHeight);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
    const around = (s) => {
      const y = clamp(s.top, Math.max(pad, page.scrollTop + pad), H - ht - pad);
      const x = clamp(s.left, pad, W - w - pad);
      return [
        { x: s.left + s.width + gap, y }, { x: s.left - gap - w, y }, // right, left
        { x, y: s.top + s.height + gap }, { x, y: s.top - gap - ht }, // below, above
      ];
    };
    const fits = (c, keepClear) => c.x >= pad && c.x + w <= W - pad && c.y >= pad && c.y + ht <= H - pad
      && !keepClear.some((b) => c.x < b.left + b.width && c.x + w > b.left && c.y < b.top + b.height && c.y + ht > b.top);
    // First keep the whole product(s) clear, so the rest of a product stays pickable; then just the selected elements
    const productOf = (el) => el.closest('.product') || el;
    const passes = [
      [boxOf(productOf(state.latest)), state.selection.map((el) => boxOf(productOf(el)))],
      [boxOf(state.latest), state.selection.map(boxOf)],
    ];
    let spot = null;
    for (const [anchor, keepClear] of passes) if (!spot) spot = around(anchor).find((c) => fits(c, keepClear));
    const s = boxOf(state.latest);
    spot ||= { x: W - w - pad, y: clamp(s.top, pad, H - ht - pad) }; // huge selections: best effort
    Object.assign(card.style, { left: `${spot.x}px`, top: `${spot.y}px` });
    // Scroll the mock page (never the website) so the whole card is visible
    if (spot.y < page.scrollTop) page.scrollTop = spot.y - pad;
    else if (spot.y + ht > page.scrollTop + page.clientHeight) page.scrollTop = spot.y + ht + pad - page.clientHeight;
  }

  /* ───────────── extraction: simulated AI, real values ───────────── */
  const FIELDS = {
    name: { words: ['name', 'title', 'product', 'nombre', 'producto'], selector: '.name' },
    price: { words: ['price', 'cost', 'precio'], selector: '.price' },
    link: { words: ['link', 'url', 'enlace'], selector: null, attribute: 'href' },
    image: { words: ['image', 'photo', 'picture', 'imagen', 'foto'], selector: '.img', attribute: 'data-image' },
    size: { words: ['size', 'unit', 'tamano', 'unidad'], selector: '.size' },
    stock: { words: ['stock', 'availab', 'disponib'], selector: '.stock' },
  };
  const DEFAULT_FIELDS = ['name', 'price', 'link'];
  const FILLER = new Set(('and y e the a an with of for all every each its their me give get i want please only also in on this page ' +
    'de del con el la los las un una cada todos todas su sus dame quiero por favor solo tambien en esta pagina items item').split(' '));
  const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function parseRequest(text) {
    const fields = [], unknown = [];
    for (const word of normalize(text).split(/[^a-z0-9]+/).filter(Boolean)) {
      const key = Object.keys(FIELDS).find((k) => FIELDS[k].words.some((w) => word.startsWith(w)));
      if (key) { if (!fields.includes(key)) fields.push(key); }
      else if (!FILLER.has(word)) unknown.push(word);
    }
    return { fields: fields.length ? fields : DEFAULT_FIELDS, unknown };
  }

  function readField(item, f) {
    const el = f.selector ? item.querySelector(f.selector) : item;
    if (!el) return '';
    if (f.attribute === 'href') return (el.closest('a[href]') || el.querySelector('a[href]'))?.href || ''; // absolute URL
    if (f.attribute) return el.getAttribute(f.attribute) || '';
    return el.textContent.replace(/\s+/g, ' ').trim();
  }

  const inDocOrder = (els) => [...els].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const fieldOf = (el) => Object.keys(FIELDS).find((k) => FIELDS[k].selector && el.matches(FIELDS[k].selector));

  // The recipe. Several parts of ONE product (and no request) → those parts are the columns;
  // several whole products → examples of the repeated item. A typed request always wins.
  function recipe(request) {
    const picks = inDocOrder(state.selection);
    const parsed = parseRequest(request);
    const products = picks.map((el) => el.closest('.product'));
    const oneProduct = picks.length > 1 && products[0] && products.every((pr) => pr === products[0]) && !picks.includes(products[0]);
    const pickedFields = oneProduct ? [...new Set(picks.map(fieldOf).filter(Boolean))] : [];
    const fields = request || !pickedFields.length ? parsed.fields : pickedFields;
    const item = state.latest.closest('.product') || state.latest; // the repeated item (or the picked element itself)
    const itemSelector = item.matches('.product') ? 'a.product' : item.localName + Array.from(item.classList, (c) => `.${c}`).join('');
    const items = item === shop ? [shop] : Array.from(shop.querySelectorAll(itemSelector));
    return { fields, unknown: parsed.unknown, itemSelector, items };
  }

  function sweep(el) {
    const box = h('div', { class: 'pick-box sweep' });
    place(box, el);
    page.append(box);
    setTimeout(() => box.remove(), 500);
  }

  async function extract(request, btn, msg) {
    const run = ++state.run;
    state.coachDone = true;
    coach();
    btn.disabled = true;
    btn.textContent = t('finding');
    msg.hidden = true;
    await wait(1200);
    if (run !== state.run) return;

    const { fields, unknown, itemSelector, items } = recipe(request);
    if (!reduceMotion.matches) {
      for (const it of items) { sweep(it); await wait(90); }
      if (run !== state.run) return;
    }

    const cols = fields.map((f) => t(`col_${f}`));
    const rows = items.map((it) => Object.fromEntries(fields.map((f, i) => [cols[i], readField(it, FIELDS[f])])));
    btn.disabled = false;
    btn.textContent = t('extractSimilar');
    msg.hidden = false;
    if (!rows.some((r) => Object.values(r).some(Boolean))) {
      msg.className = 'sp-msg err';
      msg.textContent = t('nothing');
      positionCard();
      return;
    }
    msg.className = 'sp-msg';
    msg.textContent = rows.length === 1 ? t('rowExtracted') : t('rowsExtracted', { n: rows.length });
    positionCard();
    state.data = { request, fields, cols, unknown, rows, itemSelector };
    state.sortCol = null;
    state.sortDir = 1;
    renderResults();
    await wait(reduceMotion.matches ? 0 : 700);
    if (run !== state.run) return;
    tabResults.hidden = false;
    showView('results');
  }

  /* ───────────── results tab ───────────── */
  function toNumber(v) {
    let s = String(v).replace(/[^0-9.,-]/g, '');
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = /,\d{3}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  const looksNumeric = (v) => /^[^\d]{0,5}[\d.,\s-]+[^\d]{0,8}$/.test(String(v).trim());

  function visibleRows() {
    const { rows, cols } = state.data;
    const q = ($('.r-filter', resultsView)?.value || '').trim().toLowerCase();
    const view = rows.filter((r) => !q || cols.some((c) => String(r[c]).toLowerCase().includes(q)));
    const col = state.sortCol;
    if (col) {
      const numeric = rows.every((r) => !r[col] || looksNumeric(r[col]));
      view.sort((a, b) => (numeric
        ? (toNumber(a[col]) ?? -Infinity) - (toNumber(b[col]) ?? -Infinity)
        : String(a[col]).localeCompare(String(b[col]), undefined, { numeric: true })) * state.sortDir);
    }
    return view;
  }

  // Spreadsheet apps run cells starting with = + @ as formulas; scraped text is untrusted (same rule as the extension)
  const safeCell = (v) => (/^[=+@]|^-(?!\d)/.test(v) ? `'${v}` : v);
  const toCSV = (rows, cols) => '﻿' + [cols, ...rows.map((r) => cols.map((c) => r[c]))]
    .map((line) => line.map((v) => `"${safeCell(String(v ?? '')).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const toTSV = (rows, cols) => [cols, ...rows.map((r) => cols.map((c) => safeCell(String(r[c] ?? '').replace(/[\t\r\n]+/g, ' '))))]
    .map((line) => line.join('\t')).join('\n');

  function download(content, filename, type) {
    const a = h('a', { href: URL.createObjectURL(new Blob([content], { type })), download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = h('textarea', { style: 'position:fixed;top:0;left:0;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function flash(btn, text) {
    const prev = btn.dataset.label || btn.textContent;
    btn.dataset.label = prev;
    btn.textContent = text;
    btn.classList.add('done');
    clearTimeout(btn.flashTimer);
    btn.flashTimer = setTimeout(() => { btn.textContent = prev; btn.classList.remove('done'); }, 1400);
  }

  function renderResults() {
    const d = state.data;
    const filter = h('input', { class: 'r-filter', type: 'search', placeholder: t('filterRows'), 'aria-label': t('filterRows') });
    filter.addEventListener('input', renderTable);
    const button = (text, cls, onclick) => h('button', { class: `r-btn ${cls}`, type: 'button', text, onclick });
    const how = [`${t('items')}: ${d.itemSelector}`, ...d.fields.map((f, i) => {
      const { selector, attribute } = FIELDS[f];
      return `${d.cols[i]} ← ${selector || t('theItem')}${attribute ? ` [${attribute}]` : ''}`;
    })].join(' · ');
    resultsView.replaceChildren(...[
      h('div', { class: 'r-top' },
        h('p', { class: 'r-kicker', text: t('resultsKicker') }),
        h('button', { class: 'r-back', type: 'button', text: t('back'), onclick: () => showView('page') })),
      h('h3', { text: t('resultsTitle') }),
      d.request ? h('p', { class: 'r-request', text: `“${d.request}”` }) : null,
      d.unknown.length ? h('p', { class: 'r-note', text: t('demoNote') }) : null,
      h('div', { class: 'r-tools' }, filter,
        button('⬇ Excel / CSV', 'primary', (e) => { download(toCSV(visibleRows(), d.cols), 'scrape-pro-demo.csv', 'text/csv;charset=utf-8'); flash(e.currentTarget, t('downloaded')); }),
        button(t('copySheets'), '', async (e) => { const b = e.currentTarget; await copyText(toTSV(visibleRows(), d.cols)); flash(b, t('copied')); }),
        button('⬇ JSON', '', (e) => { download(JSON.stringify(visibleRows(), null, 2), 'scrape-pro-demo.json', 'application/json'); flash(e.currentTarget, t('downloaded')); })),
      h('div', { class: 'r-count' }),
      h('div', { class: 'r-table' }, h('table', {}, h('thead'), h('tbody'))),
      h('p', { class: 'r-how', text: `${t('howExtracted')} · ${how}` }),
    ].filter(Boolean)); // the request and the note are optional
    renderTable();
  }

  function renderTable() {
    const d = state.data;
    const rows = visibleRows();
    $('thead', resultsView).replaceChildren(h('tr', {}, h('th', {}, h('button', { type: 'button', tabindex: '-1', text: '#' })),
      ...d.cols.map((f) => h('th', { 'aria-sort': state.sortCol === f ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none' },
        h('button', { type: 'button', title: t('clickToSort'), onclick: () => {
          state.sortDir = state.sortCol === f ? -state.sortDir : 1;
          state.sortCol = f;
          renderTable();
        } }, f, state.sortCol === f ? h('span', { class: 'dir', text: state.sortDir === 1 ? '↑' : '↓' }) : null)))));
    $('tbody', resultsView).replaceChildren(...rows.map((r, i) => h('tr', {}, h('td', { class: 'num', text: String(i + 1) }),
      ...d.cols.map((f) => h('td', { class: !r[f] ? 'empty' : /^https?:\/\//.test(r[f]) ? 'link' : '', title: r[f], text: r[f] || '—' })))));
    $('.r-count', resultsView).textContent =
      t('showingRows', { shown: rows.length, total: d.rows.length, cols: d.cols.length });
  }

  function showView(view) {
    state.view = view;
    for (const [tab, name] of [[tabPage, 'page'], [tabResults, 'results']]) {
      tab.classList.toggle('active', view === name);
      tab.setAttribute('aria-selected', String(view === name));
    }
    page.hidden = view !== 'page';
    resultsView.hidden = view !== 'results';
    $('#url').replaceChildren(...(view === 'page'
      ? ['supermarket.example', h('b', { text: '/deals' })]
      : ['chrome-extension://scrape-pro', h('b', { text: '/results.html' })]));
    renderExt();
    coach();
  }

  /* ───────────── coach marks: one hint at a time ───────────── */
  const coachEl = h('div', { class: 'coach', role: 'status' });
  coachEl.hidden = true;
  demo.append(coachEl);

  function coach() {
    let step = null;
    if (!state.coachDone && state.view === 'page') {
      if (!state.on) step = [1, extBtn, t('coach1'), 'below'];
      else if (!locked()) step = [2, page, t(canHover ? 'coach2' : 'coach2touch', { key: KEY }), 'none'];
      else if (!state.asked) step = [3, $('.sp-input', state.card), t('coach3'), 'above'];
      else step = [4, $('.sp-btn.primary', state.card), t('coach4'), 'below'];
    }
    coachEl.hidden = !step;
    const attention = step?.[0] === 1; // step 1 bobs and the icon pulses, so visitors find where to start
    coachEl.classList.toggle('attn', attention);
    extBtn.classList.toggle('attn', attention);
    if (!step) return;
    const [n, target, text, prefer] = step;
    coachEl.replaceChildren(h('span', { class: 'n', text: `${n}/4` }), text);
    const d = demo.getBoundingClientRect(), r = target.getBoundingClientRect();
    const w = coachEl.offsetWidth, ht = coachEl.offsetHeight;
    let side = prefer, y;
    if (side === 'none') y = r.top - d.top + 12;
    else {
      const above = r.top - d.top - ht - 9, below = r.bottom - d.top + 9;
      if (side === 'above' && above < 4) side = 'below';
      if (side === 'below' && below + ht > d.height - 4) side = 'above';
      y = side === 'above' ? above : below;
    }
    const x = Math.max(8, Math.min(r.left - d.left + r.width / 2 - w / 2, d.width - w - 8));
    coachEl.dataset.side = side;
    coachEl.style.setProperty('--ax', `${Math.max(10, Math.min(r.left - d.left + r.width / 2 - x - 4.5, w - 20))}px`);
    Object.assign(coachEl.style, { left: `${x}px`, top: `${y}px` });
  }

  /* ───────────── events ───────────── */
  extBtn.addEventListener('click', () => setPicker(!state.on));
  tabPage.addEventListener('click', () => showView('page'));
  tabResults.addEventListener('click', () => showView('results'));

  page.addEventListener('mousemove', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!state.on || !shop.contains(e.target) || (e.target === state.hovered && ctrl === state.ctrl)) return;
    state.hovered = e.target; // tracked even while locked, so holding Ctrl shows the outline right away
    state.ctrl = ctrl;
    paint();
  });
  page.addEventListener('mouseleave', () => { state.hovered = null; paint(); });
  page.addEventListener('focusin', (e) => {
    if (state.on && e.target.matches('.product')) { state.hovered = e.target; paint(); }
  });
  page.addEventListener('click', (e) => {
    if (e.target.closest('.sp-card')) return;
    if (e.target.closest('a')) e.preventDefault(); // the mock links never navigate
    if (!state.on || !shop.contains(e.target)) return;
    if (e.ctrlKey || e.metaKey || (state.addMode && locked())) toggleSelect(e.target);
    else if (locked()) closeCard(); // a plain click on the page clears the selection
    else selectOnly(e.target);
  });
  page.addEventListener('scroll', () => { paint(); coach(); }, { passive: true });

  const setCtrl = (on) => { if (state.ctrl !== on) { state.ctrl = on; paint(); } };
  document.addEventListener('keyup', (e) => { if (e.key === 'Control' || e.key === 'Meta') setCtrl(false); });
  addEventListener('blur', () => setCtrl(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') return setCtrl(true);
    if (state.view !== 'page') return;
    if (e.key === 'Escape') {
      if (locked()) { e.preventDefault(); closeCard(); } else if (state.on) { e.preventDefault(); setPicker(false); }
      return;
    }
    // Typing or using the card or results: leave the keys alone. (The icon keeps focus after a click, so buttons count.)
    if (!hoverAllowed() || !state.hovered || e.target.closest('input, textarea, .sp-card, #results')) return;
    if (e.key === 'Enter') {
      e.preventDefault(); // also stops the focused mock link from "opening" and the icon from toggling
      locked() ? toggleSelect(state.hovered) : selectOnly(state.hovered);
      return;
    }
    const next = e.key === 'ArrowUp' ? state.hovered.parentElement : e.key === 'ArrowDown' ? state.hovered.firstElementChild : null;
    if (next && shop.contains(next)) {
      e.preventDefault();
      state.hovered = next;
      paint();
    }
  });

  // Clicking outside the demo clears the selection
  document.addEventListener('pointerdown', (e) => { if (locked() && !demo.contains(e.target)) closeCard(); });
  addEventListener('resize', () => { paint(); positionCard(); coach(); });

  function resetDemo() {
    setPicker(false);
    Object.assign(state, { coachDone: false, data: null, sortCol: null, sortDir: 1 });
    tabResults.hidden = true;
    resultsView.replaceChildren();
    showView('page');
    page.scrollTop = 0;
  }
  $('#demoReset').addEventListener('click', resetDemo);
  window.spI18n.onChange(resetDemo); // restart in the new language

  renderExt();
  coach();
  addEventListener('load', coach); // re-place the first hint once the logo image and fonts are in
  setTimeout(coach, 1200); // and after the stage's entrance animation
})();
