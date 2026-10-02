# Scrape Pro

A lightweight Chrome extension (Manifest V3, vanilla JS, zero dependencies) for picking any element on a web page and getting a clean, stable CSS selector or XPath for it. It can also extract page data into a sortable table with AI and export it to Excel/CSV, JSON, or a re-runnable Python script, or write a ready-to-run Python scraper (requests + BeautifulSoup). Works with any AI provider.

## Features
- Hover highlight with tag/class label and live dimensions
- Click to capture: stable CSS selector and/or XPath, each with a uniqueness check (✓ unique / N matches)
- One-click copy of the selector or the element's full HTML
- **Multi-select** (same as Capture Pro): once something is selected the hover outline stops; hold `Ctrl` (`Cmd` on Mac) to see a dashed "+ add" / "− remove" outline and Ctrl+click to add or remove elements. A plain click clears the selection; `Esc` clears it, `Esc` again exits. On touch screens, the card's **+ Add more** toggle stands in for Ctrl. Several parts of one item become the table's columns; several similar elements are treated as examples of the repeated item; a typed request always wins.
- Keyboard: `Alt+Shift+X` toggle, `↑`/`↓` parent/child, `Enter` pick, `Esc` close/exit
- **Extract as table**: describe the data in the popup, or pick an example element and click *Extract similar items as table*. The AI only chooses selectors; the values are read from the live page, so it can't invent data. If its selectors find nothing, it gets feedback and retries once.
- **Results tab**: sort, filter, and export to Excel/CSV (UTF-8 BOM, formula-injection safe), copy for Sheets, JSON, or a Python script that repeats the extraction
- **Any AI provider**: ZenMux, Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, Ollama (local), or any OpenAI-compatible server
- AI scraper code generation for a single element (Python + BeautifulSoup)
- **English / Español**: EN | ES switch in the popup, or *Automatic* in Options (follows the browser). Translates the card, popup, Options, results, and errors; the AI names table titles and columns in the chosen language
- Clean card: selectors and element HTML sit behind **Details ▾**, and the open/closed choice is remembered
- UI isolated in a Shadow DOM, so it never clashes with the page's CSS

## Install (developer mode)
1. Download or clone this folder.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `scrape-pro` folder.
4. Pin the extension from the puzzle-piece menu.
5. Open **Options**, choose an AI provider, enter its API key and model ID, and click **Save** (or **Test connection**). Chrome asks permission to reach that one provider's server.

## Usage
1. Open any regular website. Click the toolbar icon and flip the switch, or press `Alt+Shift+X`.
2. Hover to highlight elements. Use `↑`/`↓` to move to the parent or child.
3. Click an element to get its selector, then click **Copy**.
4. Click **▦ Extract similar items as table** (optionally say which fields you want), or click **✦ Generate scraper code** for a Python script.
5. Press `Esc` to close the card; press it again to exit picker mode.

## How selectors are chosen
For each element, from most to least stable:
1. A unique `id` that doesn't look auto-generated (hashes, long numbers, React/Ember ids are skipped)
2. A unique test/form attribute: `data-testid`, `data-cy`, `data-qa`, `name`, `aria-label`…
3. The tag alone, or the shortest unique combination of non-hashed classes
4. `:nth-of-type()` as a last resort

The path climbs toward `<html>` only until the selector matches exactly one element.

## Architecture
| File | Role |
|---|---|
| `manifest.json` | MV3 config: `activeTab` + `scripting` + `storage`; provider hosts are *optional* and requested one at a time |
| `_locales/` | Extension name and description in English and Spanish (what chrome://extensions shows) |
| `icons/` | `logo.svg` (vector master) and PNGs at 16/32/48/128, plus 512 for store/website use |
| `i18n.js` | All UI texts in English and Spanish; loaded by every page, the service worker, and injected before `content.js` |
| `providers.js` | AI provider list (endpoint, API format, defaults), shared by the service worker and Options |
| `background.js` | Service worker: per-tab state, runtime-drawn icon, one `callLLM` for every provider, extract-as-table pipeline |
| `content.js` | Injected on demand: overlay, selector/XPath engine, toast UI, page snapshot, recipe runner |
| `results.*` | Results tab: sortable/filterable table and exports |
| `popup.*` | On/off switch, "Ask AI what to extract", format toggle |
| `options.*` | AI provider, key and model per provider, selector format, interface language |

## Limitations
- Chrome blocks extensions on `chrome://` pages and the Chrome Web Store.
- Elements inside iframes and closed shadow roots aren't reachable from the top page.
- For `file://` pages, enable "Allow access to file URLs" on the extension's details page.
- Upgrading from 1.0: re-save your provider in Options once to grant the new per-provider permission. Chrome keeps your old shortcut; change it at `chrome://extensions/shortcuts`.
- API keys live in local extension storage, which is fine for personal use. A production version should proxy requests through a backend.

## Changelog
- **1.3.1**: scraper code is Python only; the JavaScript (headless browser) option was removed, and a previously saved preference for it is ignored.
- **1.3.0**: renamed from Selector Scout to Scrape Pro, with a new logo and icon set. Settings and API keys carry over.
