<p align="center">
  <img src="docs/logo.svg" width="72" alt="Scrape Pro logo">
</p>

<h1 align="center">Scrape Pro</h1>

<p align="center">
  Turn any website into a spreadsheet.<br>
  A Chrome extension: point at the data or just ask for it, and AI finds the pattern while the page supplies the real values.
</p>

<p align="center">
  <a href="https://alejandrocimentada.github.io/Scrape-Pro/">Website &amp; interactive demo</a> ·
  <a href="selector-scout/README.md">Extension docs</a>
</p>

## Features

- **Pick or ask.** Click an element (Ctrl/Cmd+click for several), or describe what you want in the popup.
- **Real values, not AI guesses.** The AI only chooses selectors; every value in the table is read from the live page.
- **Results table.** Sort, filter, and export to Excel/CSV, copy for Google Sheets, JSON, or a Python script that repeats the extraction.
- **Scraper code.** A ready-to-run Python (BeautifulSoup) or Node (Puppeteer) script for any element.
- **Any AI provider.** Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, ZenMux, Ollama (local), or any OpenAI-compatible server. Chrome asks permission for only the provider you choose.
- **English / Español** throughout.

## Repository layout

| Folder | What it is |
|---|---|
| `selector-scout/` | The Chrome extension (Manifest V3, vanilla JS, no dependencies). Load this folder unpacked. The folder keeps its original name so existing installs keep their settings. |
| `docs/` | The website, served by GitHub Pages, with an interactive demo of the extension. |

## Install (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `selector-scout` folder.
4. Open the extension's **Options**, choose an AI provider, and add your API key.
