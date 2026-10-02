<p align="center">
  <img src="docs/logo.svg" width="72" alt="Scrape Pro logo">
</p>

<h1 align="center">Scrape Pro</h1>

<p align="center">
  Turn any website into a spreadsheet.<br>
  A Chrome extension: point at the data or just ask for it, and AI finds the pattern while the page supplies the real values.
</p>

<p align="center">
  <a href="https://github.com/alejandrocimentada/Scrape-Pro/releases/latest"><b>Download</b></a> ·
  <a href="INSTALL.md">Install guide</a> ·
  <a href="https://alejandrocimentada.github.io/Scrape-Pro/">Website &amp; interactive demo</a> ·
  <a href="scrape-pro/README.md">Extension docs</a>
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
| `scrape-pro/` | The Chrome extension (Manifest V3, vanilla JS, no dependencies). Load this folder unpacked. |
| `docs/` | The website, served by GitHub Pages, with an interactive demo of the extension. |

## Install

Download **scrape-pro.zip** from the [latest release](https://github.com/alejandrocimentada/Scrape-Pro/releases/latest) and follow the [install guide](INSTALL.md) (about 3 minutes, using Chrome's Developer mode).

Working from a clone instead? On `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `scrape-pro` folder.
