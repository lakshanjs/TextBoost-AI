/* global chrome */

// ---------- Element refs ----------
const els = {
    provider: document.getElementById('provider'),
    temperature: document.getElementById('temperature'),

    geminiWrap: document.getElementById('gemini-settings'),
    geminiApiKey: document.getElementById('geminiApiKey'),
    geminiModel: document.getElementById('geminiModel'),
    toggleGeminiKey: document.getElementById('toggleGeminiKey'),
    testGemini: document.getElementById('testGemini'),

    openrouterWrap: document.getElementById('openrouter-settings'),
    openrouterApiKey: document.getElementById('openrouterApiKey'),
    openrouterModel: document.getElementById('openrouterModel'),
    toggleOpenRouterKey: document.getElementById('toggleOpenRouterKey'),
    testOpenRouter: document.getElementById('testOpenRouter'),

    openaiWrap: document.getElementById('openai-settings'),
    openaiApiKey: document.getElementById('openaiApiKey'),
    openaiModel: document.getElementById('openaiModel'),
    toggleOpenAIKey: document.getElementById('toggleOpenAIKey'),
    testOpenAI: document.getElementById('testOpenAI'),

    deepseekWrap: document.getElementById('deepseek-settings'),
    deepseekApiKey: document.getElementById('deepseekApiKey'),
    deepseekModel: document.getElementById('deepseekModel'),
    toggleDeepSeekKey: document.getElementById('toggleDeepSeekKey'),
    testDeepSeek: document.getElementById('testDeepSeek'),

    save: document.getElementById('save'),
    reset: document.getElementById('reset'),
    setDeterministic: document.getElementById('setDeterministic'),
    setCreative: document.getElementById('setCreative'),
    status: document.getElementById('status')
};

// ---------- Defaults ----------
const DEFAULTS = {
    provider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash-lite',
    openrouterApiKey: '',
    openrouterModel: 'openrouter/auto',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    temperature: 0.7
};

// ---------- Utils ----------
function showToast(msg, type = 'ok', ms = 1800) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = `status show ${type}`.trim();
    window.setTimeout(() => {
        els.status.className = `status ${type}`.trim();
        els.status.textContent = '';
    }, ms);
}

function setVisible(container, visible) {
    if (!container) return;
    // Prefer class toggle if .hidden is in your CSS; fallback to style.display
    if (container.classList) {
        container.classList.toggle('hidden', !visible);
    }
    container.style.display = visible ? 'block' : 'none';
}

function sanitizeTemp(val) {
    let t = Number(val);
    if (Number.isNaN(t)) t = DEFAULTS.temperature;
    // Clamp to 0..2 (OpenAI-style range; suits most providers)
    return Math.max(0, Math.min(2, t));
}

function toggleSecret(inputEl, btnEl) {
    if (!inputEl || !btnEl) return;
    const isPassword = inputEl.type === 'password';
    inputEl.type = isPassword ? 'text' : 'password';
    btnEl.setAttribute('aria-pressed', String(isPassword));
    btnEl.textContent = isPassword ? 'Hide' : 'Show';
}

// ---------- Visibility ----------
function updateVisibility() {
    const provider = els.provider ? els.provider.value : DEFAULTS.provider;
    // If your page still has .provider-settings groups, hide them all first
    document.querySelectorAll('.provider-settings').forEach(el => {
        setVisible(el, false);
    });

    // Then show the active group by id
    const active = document.getElementById(provider + '-settings');
    setVisible(active, true);

    // Also explicitly handle known wrappers (newer UI)
    setVisible(els.geminiWrap, provider === 'gemini');
    setVisible(els.openrouterWrap, provider === 'openrouter');
    setVisible(els.openaiWrap, provider === 'openai');
    setVisible(els.deepseekWrap, provider === 'deepseek');
}

// ---------- Persistence ----------
async function restore() {
    try {
        const keys = Object.keys(DEFAULTS);
        const items = await chrome.storage.sync.get(keys);

        const state = { ...DEFAULTS, ...items };

        if (els.provider) els.provider.value = state.provider;
        if (els.geminiApiKey) els.geminiApiKey.value = state.geminiApiKey || '';
        if (els.geminiModel) els.geminiModel.value = state.geminiModel || DEFAULTS.geminiModel;
        if (els.openrouterApiKey) els.openrouterApiKey.value = state.openrouterApiKey || '';
        if (els.openrouterModel) els.openrouterModel.value = state.openrouterModel || DEFAULTS.openrouterModel;
        if (els.openaiApiKey) els.openaiApiKey.value = state.openaiApiKey || '';
        if (els.openaiModel) els.openaiModel.value = state.openaiModel || DEFAULTS.openaiModel;
        if (els.deepseekApiKey) els.deepseekApiKey.value = state.deepseekApiKey || '';
        if (els.deepseekModel) els.deepseekModel.value = state.deepseekModel || DEFAULTS.deepseekModel;
        if (els.temperature) els.temperature.value = String(state.temperature);

        updateVisibility();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('Failed to load settings', 'err', 2400);
    }
}

async function save() {
    const data = {
        provider: els.provider ? els.provider.value : DEFAULTS.provider,
        geminiApiKey: els.geminiApiKey ? els.geminiApiKey.value : '',
        geminiModel: (els.geminiModel && els.geminiModel.value) ? els.geminiModel.value : DEFAULTS.geminiModel,
        openrouterApiKey: els.openrouterApiKey ? els.openrouterApiKey.value : '',
        openrouterModel: (els.openrouterModel && els.openrouterModel.value) ? els.openrouterModel.value : DEFAULTS.openrouterModel,
        openaiApiKey: els.openaiApiKey ? els.openaiApiKey.value : '',
        openaiModel: (els.openaiModel && els.openaiModel.value) ? els.openaiModel.value : DEFAULTS.openaiModel,
        deepseekApiKey: els.deepseekApiKey ? els.deepseekApiKey.value : '',
        deepseekModel: (els.deepseekModel && els.deepseekModel.value) ? els.deepseekModel.value : DEFAULTS.deepseekModel,
        temperature: sanitizeTemp(els.temperature ? els.temperature.value : DEFAULTS.temperature)
    };

    try {
        await chrome.storage.sync.set(data);
        showToast('Settings saved', 'ok');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('Save failed', 'err', 2600);
    }
}

async function resetToDefaults() {
    try {
        // Keep existing keys by default; comment the next line to hard-reset everything.
        const keepKeys = await chrome.storage.sync.get(['geminiApiKey', 'openrouterApiKey', 'openaiApiKey', 'deepseekApiKey']);
        const data = { ...DEFAULTS, ...keepKeys };
        await chrome.storage.sync.set(data);
        await restore();
        showToast('Reset to defaults', 'warn');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('Reset failed', 'err', 2600);
    }
}

// ---------- Connection tests ----------
async function testGemini() {
    const key = (els.geminiApiKey && els.geminiApiKey.value || '').trim();
    const model = (els.geminiModel && els.geminiModel.value) || DEFAULTS.geminiModel;
    if (!key) return showToast('Enter a Gemini API key first', 'err');

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('Gemini connection OK', 'ok');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('Gemini test failed', 'err', 2600);
    }
}

async function testOpenRouter() {
    const key = (els.openrouterApiKey && els.openrouterApiKey.value || '').trim();
    if (!key) return showToast('Enter an OpenRouter API key first', 'err');

    try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                Authorization: `Bearer ${key}`
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('OpenRouter connection OK', 'ok');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('OpenRouter test failed', 'err', 2600);
    }
}

async function testOpenAI() {
    const key = (els.openaiApiKey && els.openaiApiKey.value || '').trim();
    if (!key) return showToast('Enter an OpenAI API key first', 'err');

    try {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: {
                Authorization: `Bearer ${key}`
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('OpenAI connection OK', 'ok');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('OpenAI test failed', 'err', 2600);
    }
}

async function testDeepSeek() {
    const key = (els.deepseekApiKey && els.deepseekApiKey.value || '').trim();
    if (!key) return showToast('Enter a DeepSeek API key first', 'err');

    try {
        const res = await fetch('https://api.deepseek.com/v1/models', {
            headers: {
                Authorization: `Bearer ${key}`
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('DeepSeek connection OK', 'ok');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        showToast('DeepSeek test failed', 'err', 2600);
    }
}

// ---------- Wire events ----------
document.addEventListener('DOMContentLoaded', () => {
    restore();

    if (els.save) els.save.addEventListener('click', save);
    if (els.provider) els.provider.addEventListener('change', updateVisibility);

    // Temperature validation
    if (els.temperature) {
        els.temperature.addEventListener('blur', () => {
            els.temperature.value = String(sanitizeTemp(els.temperature.value));
        });
    }

    // Show/Hide secret buttons (if present in your HTML)
    if (els.toggleGeminiKey && els.geminiApiKey) {
        els.toggleGeminiKey.addEventListener('click', () => toggleSecret(els.geminiApiKey, els.toggleGeminiKey));
    }
    if (els.toggleOpenRouterKey && els.openrouterApiKey) {
        els.toggleOpenRouterKey.addEventListener('click', () => toggleSecret(els.openrouterApiKey, els.toggleOpenRouterKey));
    }
    if (els.toggleOpenAIKey && els.openaiApiKey) {
        els.toggleOpenAIKey.addEventListener('click', () => toggleSecret(els.openaiApiKey, els.toggleOpenAIKey));
    }
    if (els.toggleDeepSeekKey && els.deepseekApiKey) {
        els.toggleDeepSeekKey.addEventListener('click', () => toggleSecret(els.deepseekApiKey, els.toggleDeepSeekKey));
    }

    // Preset buttons (optional)
    if (els.setDeterministic && els.temperature) {
        els.setDeterministic.addEventListener('click', () => {
            els.temperature.value = '0';
            showToast('Temperature set to 0 (deterministic)', 'warn');
        });
    }
    if (els.setCreative && els.temperature) {
        els.setCreative.addEventListener('click', () => {
            els.temperature.value = '0.7';
            showToast('Temperature set to 0.7 (creative)', 'warn');
        });
    }

    // Test buttons (optional)
    if (els.testGemini) els.testGemini.addEventListener('click', testGemini);
    if (els.testOpenRouter) els.testOpenRouter.addEventListener('click', testOpenRouter);
    if (els.testOpenAI) els.testOpenAI.addEventListener('click', testOpenAI);
    if (els.testDeepSeek) els.testDeepSeek.addEventListener('click', testDeepSeek);

    // Reset (optional)
    if (els.reset) els.reset.addEventListener('click', resetToDefaults);
});
