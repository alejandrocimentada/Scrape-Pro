# Installing Scrape Pro

This takes about 3 minutes. Scrape Pro isn't on the Chrome Web Store yet, so you'll install it with Chrome's **Developer mode**, a built-in feature made for exactly this.

**Requirements:** Google Chrome, Microsoft Edge, or Brave, version 116 or newer.

## 1. Download

1. Go to the [latest release](https://github.com/alejandrocimentada/Scrape-Pro/releases/latest).
2. Under **Assets**, click **scrape-pro.zip**.

## 2. Unzip it somewhere permanent

- **Windows:** right-click the ZIP → **Extract All…** → choose a folder such as `Documents\Extensions\scrape-pro`.
- **Mac:** double-click the ZIP, then move the folder to somewhere like `Documents/Extensions`.

> ⚠️ Chrome loads the extension from this folder every time it starts. If you delete or move the folder, the extension stops working and its settings (including your API key) are lost.

Make sure `manifest.json` is directly inside the folder, not inside another folder.

## 3. Turn on Developer mode

1. Open a new tab and go to `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
2. Turn on **Developer mode**: top-right corner in Chrome and Brave, left sidebar in Edge.

## 4. Load the extension

1. Click **Load unpacked**.
2. Select the folder from step 2, the one that contains `manifest.json`, and click **Select Folder**.
3. **Scrape Pro** appears in the list with its violet logo.

## 5. Pin it and check the shortcut

1. Click the puzzle-piece icon in the toolbar and pin **Scrape Pro**.
2. Click its icon to open the popup. If the shortcut says **set shortcut**, click it and assign one (`Alt+Shift+X` is recommended). Another extension may already be using that combination.

## 6. Connect an AI provider

Scrape Pro uses your own API key from the provider you choose, so you only pay for what you use (usually a fraction of a cent per table, or nothing with a local model). The AI only decides *where* the data is on the page; the values in your table are always read from the page itself.

1. Get an API key from a provider. Built-in presets: **Anthropic** (Claude), **OpenAI**, **Google Gemini**, **OpenRouter** (many models, one key), **Groq**, **Mistral**, **DeepSeek**, **xAI**, **ZenMux**, and **Ollama** (runs on your own computer, free).
2. Right-click the Scrape Pro icon → **Options** (or click **Settings & AI provider** in the popup).
3. Choose your **Provider**, paste your **API key**, and enter a **Model ID** exactly as your provider lists it.
4. Click **Test connection**, then **Allow** when Chrome asks for access to the provider's server. The extension can only reach that one address. You should see **Connected ✓**.

**Other servers:** choose **Custom (OpenAI-compatible)** and enter the full endpoint URL, for example `http://localhost:1234/v1/chat/completions` for LM Studio. Local servers usually don't need a key.

**Ollama:** if you get a 403 error, set the environment variable `OLLAMA_ORIGINS=chrome-extension://*` and restart Ollama.

Your key is stored only in this browser and is never synced.

## 7. Try it

1. Open any regular website (for example [books.toscrape.com](https://books.toscrape.com)) and **refresh** the page.
2. **Ask for the data:** open the popup, type something like `every book with title, price and link`, and press **Enter**. The table opens in a new tab.
3. **Or point at it:** press `Alt+Shift+X`, then click one item on the page. A violet outline follows your mouse; the picked element turns green. Hold `Ctrl` (`Cmd` on Mac) and click to pick several parts, such as a title and a price. Then click **▦ Extract similar items as table**.
4. In the results tab, sort and filter, then **⬇ Excel / CSV**, **Copy for Excel / Sheets**, **⬇ JSON**, or **⬇ Python script** to repeat the extraction later.

The popup has an **EN | ES** switch, and Options has a language setting.

## Updating

1. Download the new ZIP from the latest release.
2. Replace the files in your extension folder with the new ones.
3. On `chrome://extensions`, click the reload arrow ⟳ on Scrape Pro, then refresh any open tabs.

Your settings and API key are kept, as long as you use the same folder.

## Uninstalling

On `chrome://extensions`, click **Remove** on Scrape Pro, then delete its folder.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | You selected the wrong folder. Choose the one that directly contains `manifest.json`. |
| The shortcut does nothing | Open `chrome://extensions/shortcuts`, assign a shortcut to Scrape Pro, then refresh the page. |
| "Chrome doesn't allow extensions on this page" | Chrome blocks extensions on `chrome://` pages and the Web Store. Try a regular website. |
| "Lost connection to the extension", or nothing happens after an update | Refresh the web page. Tabs opened before an update still run the old version. |
| "No API key yet" or "No model selected" | Fill them in on the Options page (step 6). |
| "Couldn't reach the provider …" | Open Options, click **Save settings**, and click **Allow** in Chrome's prompt. Check the endpoint URL for Custom. |
| "API error" or "model not found" | Check that the model ID matches your provider's list exactly. |
| "The AI couldn't find matching data on this page" | Describe the data differently, or pick an example element first (hold `Ctrl` to pick several parts of one item). |
| The table is empty on sites that load data as you scroll | Scroll so the items are on screen, then extract again. |
| Chrome reminds you about developer-mode extensions | That's normal for extensions installed outside the Web Store. You can dismiss it. |

Still stuck? [Open an issue](https://github.com/alejandrocimentada/Scrape-Pro/issues) with a screenshot.

## For maintainers: publishing a release

1. Set the new version in `scrape-pro/manifest.json` and commit it.
2. Tag the commit with the same version and push the tag:
   ```
   git tag v1.3.0
   git push origin v1.3.0
   ```
3. The **Release** workflow (`.github/workflows/release.yml`) checks that the tag matches `manifest.json`, zips the **contents** of `scrape-pro/` as `scrape-pro.zip` (so `manifest.json` is at the top level), and publishes the release.
4. The website's download button always points to `releases/latest/download/scrape-pro.zip`, so it updates automatically.
