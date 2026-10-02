// UI texts in English and Spanish, shared by every part of the extension.
// Written so it can be injected into a page more than once without errors.
self.ssI18n ??= (() => {
  const STRINGS = {
    en: {
      // on-page card
      pickerHint: 'click to pick · Ctrl+click for several · ↑↓ parent/child · Esc to exit',
      pickerHintLocked: 'hold Ctrl to add or remove · click the page to clear · Esc to clear',
      elementSelected: 'Element selected',
      elementsSelected: '{n} elements selected',
      multiHint: 'Hold Ctrl and click to add or remove elements',
      addMore: '+ Add more',
      addingOn: '✓ Adding: tap to add or remove',
      addLabel: '+ add',
      removeLabel: '− remove',
      close: 'Close (Esc)',
      details: 'Details ▾',
      hideDetails: 'Details ▴',
      cssSelector: 'CSS selector',
      xpath: 'XPath',
      unique: '✓ unique',
      noMatch: 'no match',
      matches: '{n} matches',
      copy: 'Copy',
      copied: 'Copied ✓',
      copyHtml: 'Copy HTML',
      copyCode: 'Copy code',
      elementHtml: 'Element HTML',
      nestedInfo: '{n} nested elements · {kb} KB',
      htmlTitle: 'Full HTML is copied, including all nested elements',
      extractData: 'Extract data',
      extractPlaceholder: 'Optional: what do you want? e.g. title, price, rating',
      extractSimilar: '▦ Extract similar items as table',
      aiReading: 'AI is reading the page…',
      rowsExtractedTab: '✓ {n} rows extracted. The table opened in a new tab.',
      lostConnection: 'Lost connection to the extension. Refresh the page and try again.',
      scraperCode: 'Scraper code',
      generateCode: '✦ Generate scraper code',
      askingAi: 'Asking AI…',
      regenerate: '✦ Regenerate',
      // popup
      activeOnTab: 'Active on this tab',
      off: 'Off',
      askLabel: 'Ask AI what to extract from this page',
      askPlaceholder: 'e.g. every product with its name, price and link',
      extractTable: '▦ Extract as table',
      askWait: 'Usually 10–30 seconds. The table opens in a new tab.',
      rowsExtracted: '✓ {n} rows extracted.',
      somethingWrong: 'Something went wrong.',
      picker: 'picker',
      exit: 'exit',
      setShortcut: 'set shortcut',
      changeShortcut: 'Change shortcut',
      settingsLink: 'Settings & AI provider →',
      both: 'Both',
      // options
      optionsLead: 'Pick elements, extract page data into tables, and generate scrapers with the AI provider of your choice.',
      aiProvider: 'AI provider',
      provider: 'Provider',
      endpointUrl: 'Endpoint URL (OpenAI-compatible)',
      apiKey: 'API key',
      show: 'Show',
      hide: 'Hide',
      modelId: 'Model ID',
      modelPlaceholder: 'Model ID from your provider',
      keysNote: "Keys are stored only in this browser (never synced), one per provider. When you save, Chrome asks permission to contact that provider's server. It's the only server the extension talks to.",
      pickerSection: 'Picker',
      selectorFormat: 'Selector format',
      defaultScraperLang: 'Default scraper language',
      languageSection: 'Language',
      interfaceLanguage: 'Interface language',
      langAuto: 'Automatic (browser language)',
      save: 'Save settings',
      testConnection: 'Test connection',
      invalidUrl: 'Enter a valid endpoint URL.',
      enterKey: 'Enter your API key.',
      enterModel: 'Enter a model ID.',
      permissionDenied: "Permission not granted: the extension can't reach this provider without it.",
      saved: 'Saved ✓',
      testing: 'Saved. Testing…',
      connected: 'Connected ✓ (model replied: "{reply}")',
      failed: 'Failed: {error}',
      // results tab
      resultsKicker: 'Scrape Pro · extracted data',
      loading: 'Loading…',
      extractedData: 'Extracted data',
      from: 'From',
      filterRows: 'Filter rows…',
      exportCsv: '⬇ Excel / CSV',
      copySheets: 'Copy for Excel / Sheets',
      exportJson: '⬇ JSON',
      exportPy: '⬇ Python script',
      showingRows: 'Showing {shown} of {total} rows · {cols} columns · exports include the rows shown',
      howExtracted: 'How this was extracted (selectors)',
      items: 'Items',
      wholePage: '(whole page, one row)',
      theItem: '(the item)',
      clickToSort: 'Click to sort',
      downloaded: 'Downloaded ✓',
      copiedPaste: 'Copied, now paste ✓',
      resultsGone: 'These results are no longer available. Run the extraction again.',
      // errors
      errRestricted: "Chrome doesn't allow extensions on this page (chrome:// pages, the Web Store, etc.). Try a regular website.",
      errNoTab: 'No active tab.',
      errUnreadable: 'Could not read this page. Refresh it and try again.',
      errNoMatch: "The AI couldn't find matching data on this page. Try describing it differently, or pick an example element first.",
      errNoUrl: 'Set the endpoint URL in Options.',
      errNoKey: 'No API key yet. Add one on the Options page.',
      errNoModel: 'No model selected. Add a model ID on the Options page.',
      errTimeout: 'The AI took too long. Try again.',
      errUnreachable: "Couldn't reach the provider ({msg}). Check the URL, and save the provider in Options to grant permission.",
      errEmpty: 'The AI returned an empty response. Try again or pick another model.',
      errApi: 'API error (HTTP {status})',
    },

    es: {
      // tarjeta en la página
      pickerHint: 'clic para elegir · Ctrl+clic para varios · ↑↓ padre/hijo · Esc para salir',
      pickerHintLocked: 'mantén Ctrl para añadir o quitar · clic en la página para limpiar · Esc para limpiar',
      elementSelected: 'Elemento seleccionado',
      elementsSelected: '{n} elementos seleccionados',
      multiHint: 'Mantén Ctrl y haz clic para añadir o quitar elementos',
      addMore: '+ Añadir más',
      addingOn: '✓ Añadiendo: toca para añadir o quitar',
      addLabel: '+ añadir',
      removeLabel: '− quitar',
      close: 'Cerrar (Esc)',
      details: 'Detalles ▾',
      hideDetails: 'Detalles ▴',
      cssSelector: 'Selector CSS',
      xpath: 'XPath',
      unique: '✓ único',
      noMatch: 'sin coincidencias',
      matches: '{n} coincidencias',
      copy: 'Copiar',
      copied: 'Copiado ✓',
      copyHtml: 'Copiar HTML',
      copyCode: 'Copiar código',
      elementHtml: 'HTML del elemento',
      nestedInfo: '{n} elementos anidados · {kb} KB',
      htmlTitle: 'Se copia el HTML completo, incluidos todos los elementos anidados',
      extractData: 'Extraer datos',
      extractPlaceholder: 'Opcional: ¿qué quieres? ej. título, precio, calificación',
      extractSimilar: '▦ Extraer elementos similares como tabla',
      aiReading: 'La IA está leyendo la página…',
      rowsExtractedTab: '✓ {n} filas extraídas. La tabla se abrió en una pestaña nueva.',
      lostConnection: 'Se perdió la conexión con la extensión. Recarga la página e inténtalo de nuevo.',
      scraperCode: 'Código del scraper',
      generateCode: '✦ Generar código del scraper',
      askingAi: 'Consultando a la IA…',
      regenerate: '✦ Regenerar',
      // popup
      activeOnTab: 'Activo en esta pestaña',
      off: 'Apagado',
      askLabel: 'Pídele a la IA qué extraer de esta página',
      askPlaceholder: 'ej. cada producto con su nombre, precio y enlace',
      extractTable: '▦ Extraer como tabla',
      askWait: 'Suele tardar de 10 a 30 segundos. La tabla se abre en una pestaña nueva.',
      rowsExtracted: '✓ {n} filas extraídas.',
      somethingWrong: 'Algo salió mal.',
      picker: 'selector',
      exit: 'salir',
      setShortcut: 'asignar atajo',
      changeShortcut: 'Cambiar atajo',
      settingsLink: 'Configuración y proveedor de IA →',
      both: 'Ambos',
      // opciones
      optionsLead: 'Elige elementos, extrae datos de páginas a tablas y genera scrapers con el proveedor de IA que prefieras.',
      aiProvider: 'Proveedor de IA',
      provider: 'Proveedor',
      endpointUrl: 'URL del endpoint (compatible con OpenAI)',
      apiKey: 'Clave de API',
      show: 'Mostrar',
      hide: 'Ocultar',
      modelId: 'ID del modelo',
      modelPlaceholder: 'ID del modelo de tu proveedor',
      keysNote: 'Las claves se guardan solo en este navegador (nunca se sincronizan), una por proveedor. Al guardar, Chrome pide permiso para contactar el servidor de ese proveedor. Es el único servidor con el que se comunica la extensión.',
      pickerSection: 'Selector de elementos',
      selectorFormat: 'Formato del selector',
      defaultScraperLang: 'Lenguaje predeterminado del scraper',
      languageSection: 'Idioma',
      interfaceLanguage: 'Idioma de la interfaz',
      langAuto: 'Automático (idioma del navegador)',
      save: 'Guardar configuración',
      testConnection: 'Probar conexión',
      invalidUrl: 'Escribe una URL de endpoint válida.',
      enterKey: 'Escribe tu clave de API.',
      enterModel: 'Escribe un ID de modelo.',
      permissionDenied: 'Permiso no concedido: la extensión no puede comunicarse con este proveedor sin él.',
      saved: 'Guardado ✓',
      testing: 'Guardado. Probando…',
      connected: 'Conectado ✓ (el modelo respondió: "{reply}")',
      failed: 'Falló: {error}',
      label_zenmux: 'ZenMux (compatible con Anthropic)',
      label_openrouter: 'OpenRouter (muchos modelos, una clave)',
      label_ollama: 'Ollama (local, gratis)',
      label_custom: 'Personalizado (compatible con OpenAI)',
      note_zenmux: 'Copia los IDs de modelo desde zenmux.ai/models (filtro: Anthropic API Compatible).',
      note_anthropic: 'Crea una clave en console.anthropic.com.',
      note_openai: 'Crea una clave en platform.openai.com y copia un ID de modelo de su lista de modelos.',
      note_gemini: 'Crea una clave en Google AI Studio.',
      note_openrouter: 'Los IDs de modelo tienen el formato proveedor/modelo. Consulta openrouter.ai/models.',
      note_ollama: 'Ejecuta modelos en tu propia computadora. Usa un modelo que hayas descargado. Si recibes un error 403, define OLLAMA_ORIGINS=chrome-extension://* y reinicia Ollama.',
      note_custom: 'Cualquier servidor que implemente la API Chat Completions de OpenAI.',
      // pestaña de resultados
      resultsKicker: 'Scrape Pro · datos extraídos',
      loading: 'Cargando…',
      extractedData: 'Datos extraídos',
      from: 'De',
      filterRows: 'Filtrar filas…',
      exportCsv: '⬇ Excel / CSV',
      copySheets: 'Copiar para Excel / Sheets',
      exportJson: '⬇ JSON',
      exportPy: '⬇ Script de Python',
      showingRows: 'Mostrando {shown} de {total} filas · {cols} columnas · las exportaciones incluyen las filas mostradas',
      howExtracted: 'Cómo se extrajo (selectores)',
      items: 'Elementos',
      wholePage: '(página completa, una fila)',
      theItem: '(el elemento)',
      clickToSort: 'Clic para ordenar',
      downloaded: 'Descargado ✓',
      copiedPaste: 'Copiado, ahora pega ✓',
      resultsGone: 'Estos resultados ya no están disponibles. Vuelve a ejecutar la extracción.',
      // errores
      errRestricted: 'Chrome no permite extensiones en esta página (páginas chrome://, la Chrome Web Store, etc.). Prueba con un sitio web normal.',
      errNoTab: 'No hay una pestaña activa.',
      errUnreadable: 'No se pudo leer esta página. Recárgala e inténtalo de nuevo.',
      errNoMatch: 'La IA no encontró datos que coincidan en esta página. Descríbelos de otra forma o elige primero un elemento de ejemplo.',
      errNoUrl: 'Configura la URL del endpoint en Opciones.',
      errNoKey: 'Todavía no hay clave de API. Agrégala en la página de Opciones.',
      errNoModel: 'No hay modelo seleccionado. Agrega un ID de modelo en la página de Opciones.',
      errTimeout: 'La IA tardó demasiado. Inténtalo de nuevo.',
      errUnreachable: 'No se pudo contactar al proveedor ({msg}). Revisa la URL y guarda el proveedor en Opciones para conceder el permiso.',
      errEmpty: 'La IA devolvió una respuesta vacía. Inténtalo de nuevo o elige otro modelo.',
      errApi: 'Error de la API (HTTP {status})',
    },
  };

  let lang = 'en';
  const resolve = (pref) => (pref === 'en' || pref === 'es')
    ? pref
    : (String(self.navigator?.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');

  async function init() {
    try {
      const { uiLang } = await chrome.storage.sync.get({ uiLang: 'auto' });
      lang = resolve(uiLang);
    } catch { /* storage unavailable: keep the current language */ }
    return lang;
  }

  const has = (key) => key in STRINGS[lang] || key in STRINGS.en;

  function t(key, vars = {}) {
    const text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
  }

  // Fills static pages: data-i18n (text), data-i18n-placeholder, data-i18n-title.
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    if (root.documentElement) root.documentElement.lang = lang;
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.uiLang) {
        lang = resolve(changes.uiLang.newValue);
        callback(lang);
      }
    });
  }

  return { init, t, has, apply, onChange, get lang() { return lang; } };
})();
