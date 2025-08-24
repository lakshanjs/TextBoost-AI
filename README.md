# TextBoost AI (Chrome Extension)

Highlight text inside an input, textarea, or contenteditable element. Right-click → **TextBoost AI** → choose:
- **Quick rewrite** (clarify & fix grammar)
- **Summarize**
- **Write in detail**

The selection is replaced with AI output using Gemini, OpenRouter, OpenAI, or DeepSeek.

## Install (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Focus any editable field, highlight text, and right-click to use **TextBoost AI**.

## Usage

1. Highlight text inside an input, textarea, or any element with the `contenteditable` attribute.
2. Right-click and choose **TextBoost AI** from the context menu.
3. Select **Quick rewrite**, **Summarize**, or **Write in detail**.
4. The highlighted text is replaced with the AI-generated result.

## Configuration

Open the extension's options page to choose between Gemini, OpenRouter, OpenAI, or DeepSeek, provide your API key, select a model, and adjust temperature.

## Generate API Keys

### Gemini
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open the **Get API key** page.
4. Click **Create API key**, then copy the generated key.

### OpenRouter
1. Go to [openrouter.ai](https://openrouter.ai/).
2. Sign up or log in.
3. Navigate to the **API Keys** page.
4. Select **Create Key** and copy the token that is displayed.

### OpenAI
1. Visit the [OpenAI dashboard](https://platform.openai.com/).
2. Sign in or create an account.
3. Open **API keys** from your profile menu.
4. Click **Create new secret key** and store the key shown.

### DeepSeek
1. Navigate to [platform.deepseek.com](https://platform.deepseek.com/).
2. Create an account or log in.
3. Open the **API Keys** section.
4. Click **Generate New Key** and copy the value provided.

> ⚠️ **Security note**: API keys are stored in Chrome's extension storage; treat this extension as a personal tool.
