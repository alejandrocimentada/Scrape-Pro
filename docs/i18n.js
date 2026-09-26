// Scrape Pro website: English / Spanish. Static text uses data-i18n (plain text) or data-i18n-html
// (only for our own strings below); demo.js reads its texts through spI18n.t().
window.spI18n = (() => {
  const STRINGS = {
    en: {
      pageTitle: 'Scrape Pro · Turn any website into a spreadsheet',
      pageDescription: "A free Chrome extension: point at any website's data or just ask for it, and Scrape Pro turns it into a clean table for Excel, JSON, or a ready-to-run Python scraper.",
      installGuide: 'Install guide',
      headline: 'Turn any website<br><span class="grad">into a spreadsheet.</span>',
      lead: "Point at the data or just ask for it. Scrape Pro's AI finds the pattern, reads the real values from the page, and hands you a clean table for Excel, JSON, or a ready-to-run Python scraper.",
      download: 'Download for Chrome',
      fine: 'Free · Chrome, Edge & Brave · Works with Claude, OpenAI, Gemini, OpenRouter, Ollama and more ·',
      caption: 'Interactive demo · the AI step is simulated on this page. Your data never leaves your browser. ·',
      reset: 'Reset demo',
      // mock page
      shopTitle: 'Deals this week',
      shopMeta: '8 products · prices in RD$',
      p1042: 'Ground coffee', p1043: 'Rice', p1044: 'Olive oil', p1045: 'Pasta',
      p1046: 'Oat milk', p1047: 'Black beans', p1048: 'Cheddar cheese', p1049: 'Orange juice',
      inStock: 'In stock', outOfStock: 'Out of stock',
      resultsTab: 'Scrape Pro · results',
      // extension icon + coach marks
      extTitle: 'Scrape Pro: turn the picker on or off',
      extDisabled: 'The picker works on web pages, not on the results tab',
      coach1: 'Click to turn on Scrape Pro',
      coach2: 'Click a product, or hold {key} to pick several parts of it',
      coach2touch: 'Tap a product to pick it',
      coach3: 'Say what you want, or leave it empty',
      coach4: 'Extract',
      // card
      elementSelected: 'Element selected',
      elementsSelected: '{n} elements selected',
      multiHint: 'Hold {key} and click to add or remove elements',
      addMore: '+ Add more', addingOn: '✓ Adding: tap to add or remove',
      addLabel: '+ add', removeLabel: '− remove',
      details: 'Details ▾', hideDetails: 'Details ▴',
      close: 'Close (Esc)',
      cssSelector: 'CSS selector', unique: '✓ unique', matches: '{n} matches',
      copy: 'Copy', copied: '✓ Copied',
      extractData: 'Extract data',
      extractPlaceholder: 'Optional: what do you want? e.g. name, price, link',
      extractAria: 'What to extract',
      extractSimilar: '▦ Extract similar items as table',
      simulatedAi: 'Simulated AI: on this page, keyword matching stands in for the real AI. Values are read from the page.',
      finding: 'Finding the pattern…',
      nothing: 'Nothing to extract here. Pick a product, or anything inside one, and try again.',
      rowsExtracted: '✓ {n} rows extracted. The table opened in a new tab.',
      rowExtracted: '✓ 1 row extracted. The table opened in a new tab.',
      scraperCode: 'Scraper code', generateCode: '✦ Generate scraper code', inExtension: 'Available in the extension',
      // results tab
      resultsKicker: 'Scrape Pro · extracted data',
      back: '← Back to page',
      resultsTitle: 'Products on sale',
      demoNote: "This demo understands name, price, link, image, size and stock. The real extension's AI handles any request.",
      filterRows: 'Filter rows…',
      copySheets: 'Copy for Excel / Sheets',
      downloaded: '✓ Downloaded',
      clickToSort: 'Click to sort',
      showingRows: 'Showing {shown} of {total} rows · {cols} columns · exports include the rows shown',
      howExtracted: 'How this was extracted', items: 'Items', theItem: '(the item)',
      col_name: 'name', col_price: 'price', col_link: 'link', col_image: 'image', col_size: 'size', col_stock: 'stock',
    },
    es: {
      pageTitle: 'Scrape Pro · Convierte cualquier web en una hoja de cálculo',
      pageDescription: 'Una extensión gratis para Chrome: señala los datos de cualquier web o simplemente pídelos, y Scrape Pro los convierte en una tabla limpia para Excel, JSON o un scraper de Python listo para usar.',
      installGuide: 'Guía de instalación',
      headline: 'Convierte cualquier web<br><span class="grad">en una hoja de cálculo.</span>',
      lead: 'Señala los datos o simplemente pídelos. La IA de Scrape Pro encuentra el patrón, lee los valores reales de la página y te entrega una tabla limpia para Excel, JSON o un scraper de Python listo para usar.',
      download: 'Descargar para Chrome',
      fine: 'Gratis · Chrome, Edge y Brave · Funciona con Claude, OpenAI, Gemini, OpenRouter, Ollama y más ·',
      caption: 'Demo interactiva · el paso de IA está simulado en esta página. Tus datos nunca salen de tu navegador. ·',
      reset: 'Reiniciar demo',
      shopTitle: 'Ofertas de la semana',
      shopMeta: '8 productos · precios en RD$',
      p1042: 'Café molido', p1043: 'Arroz', p1044: 'Aceite de oliva', p1045: 'Pasta',
      p1046: 'Leche de avena', p1047: 'Habichuelas negras', p1048: 'Queso cheddar', p1049: 'Jugo de naranja',
      inStock: 'Disponible', outOfStock: 'Agotado',
      resultsTab: 'Scrape Pro · resultados',
      extTitle: 'Scrape Pro: activa o desactiva el selector',
      extDisabled: 'El selector funciona en páginas web, no en la pestaña de resultados',
      coach1: 'Haz clic para activar Scrape Pro',
      coach2: 'Haz clic en un producto, o mantén {key} para elegir varias partes',
      coach2touch: 'Toca un producto para elegirlo',
      coach3: 'Di qué quieres, o déjalo vacío',
      coach4: 'Extraer',
      elementSelected: 'Elemento seleccionado',
      elementsSelected: '{n} elementos seleccionados',
      multiHint: 'Mantén {key} y haz clic para añadir o quitar elementos',
      addMore: '+ Añadir más', addingOn: '✓ Añadiendo: toca para añadir o quitar',
      addLabel: '+ añadir', removeLabel: '− quitar',
      details: 'Detalles ▾', hideDetails: 'Detalles ▴',
      close: 'Cerrar (Esc)',
      cssSelector: 'Selector CSS', unique: '✓ único', matches: '{n} coincidencias',
      copy: 'Copiar', copied: '✓ Copiado',
      extractData: 'Extraer datos',
      extractPlaceholder: 'Opcional: ¿qué quieres? ej. nombre, precio, enlace',
      extractAria: 'Qué extraer',
      extractSimilar: '▦ Extraer elementos similares como tabla',
      simulatedAi: 'IA simulada: en esta página, una búsqueda de palabras clave reemplaza a la IA real. Los valores se leen de la página.',
      finding: 'Buscando el patrón…',
      nothing: 'No hay nada que extraer aquí. Elige un producto, o algo dentro de uno, e inténtalo de nuevo.',
      rowsExtracted: '✓ {n} filas extraídas. La tabla se abrió en una pestaña nueva.',
      rowExtracted: '✓ 1 fila extraída. La tabla se abrió en una pestaña nueva.',
      scraperCode: 'Código del scraper', generateCode: '✦ Generar código del scraper', inExtension: 'Disponible en la extensión',
      resultsKicker: 'Scrape Pro · datos extraídos',
      back: '← Volver a la página',
      resultsTitle: 'Productos en oferta',
      demoNote: 'Esta demo entiende nombre, precio, enlace, imagen, tamaño y disponibilidad. La IA de la extensión real entiende cualquier petición.',
      filterRows: 'Filtrar filas…',
      copySheets: 'Copiar para Excel / Sheets',
      downloaded: '✓ Descargado',
      clickToSort: 'Clic para ordenar',
      showingRows: 'Mostrando {shown} de {total} filas · {cols} columnas · las exportaciones incluyen las filas mostradas',
      howExtracted: 'Cómo se extrajo', items: 'Elementos', theItem: '(el elemento)',
      col_name: 'nombre', col_price: 'precio', col_link: 'enlace', col_image: 'imagen', col_size: 'tamaño', col_stock: 'disponibilidad',
    },
  };

  const listeners = [];
  const stored = (() => { try { return localStorage.getItem('sp-lang'); } catch { return null; } })();
  const valid = (l) => l === 'en' || l === 'es';
  // ?lang=es in the URL, then the visitor's last choice, then the browser language
  let lang = [new URLSearchParams(location.search).get('lang'), stored].find(valid)
    || (String(navigator.language).toLowerCase().startsWith('es') ? 'es' : 'en');

  const t = (key, vars = {}) => (STRINGS[lang][key] ?? STRINGS.en[key] ?? key)
    .replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('pageTitle');
    document.querySelector('meta[name="description"]').content = t('pageDescription');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }

  function setLang(next) {
    if (!valid(next) || next === lang) return;
    lang = next;
    try { localStorage.setItem('sp-lang', lang); } catch { /* private mode: the choice lasts until reload */ }
    apply();
    listeners.forEach((fn) => fn(lang));
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang button');
    if (btn) setLang(btn.dataset.lang);
  });
  apply();
  return { t, setLang, onChange: (fn) => listeners.push(fn), get lang() { return lang; } };
})();
