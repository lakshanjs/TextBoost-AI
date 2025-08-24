# TextBoost AI (Chrome Extension)

Highlight text inside an input, textarea, or contenteditable element. Right-click → **TextBoost AI** → choose:
- **Better write** (clarify & fix grammar)
- **Summarize**
- **Write in detail**

The selection is replaced with AI output using Google's Generative Language API.

## Install (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Focus any editable field, highlight text, and right-click to use **TextBoost AI**.

> ⚠️ **Security note**: The API key is embedded in `background.js`. Anyone can extract it from an unpacked extension. For broader distribution, remove the hardcoded key and add an options page or proxy calls through your backend.
