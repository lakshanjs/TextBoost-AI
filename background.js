// TextBoost AI - Background Service Worker (Manifest V3)
// API keys and models are configured via the extension options page and stored in chrome.storage.

const DEFAULT_SETTINGS = {
    provider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash-lite',
    openrouterApiKey: '',
    openrouterModel: 'openrouter/auto',
    temperature: 0.7
};

function getSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
    });
}

// Mirror logs to the page's DevTools console
async function pageLog(tabId, ...args) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (...a) => console.log("[TextBoost AI]", ...a),
            args
        });
    } catch (e) {
        // If we can't inject (e.g., chrome:// pages), ignore
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ai-root",
        title: "TextBoost AI",
        contexts: ["editable"]
    });
    chrome.contextMenus.create({
        id: "ai-better-write",
        parentId: "ai-root",
        title: "Better write (clarify & fix grammar)",
        contexts: ["editable"]
    });
    chrome.contextMenus.create({
        id: "ai-summarize",
        parentId: "ai-root",
        title: "Summarize",
        contexts: ["editable"]
    });
    chrome.contextMenus.create({
        id: "ai-expand",
        parentId: "ai-root",
        title: "Write in detail",
        contexts: ["editable"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;
    const action = info.menuItemId;
    if (!["ai-better-write", "ai-summarize", "ai-expand"].includes(action)) return;

    // UPDATED: Get both text and element info in one call
    const [{ result, error }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getSelectedEditableTextAndElement
    });

    if (error) {
        notify(tab.id, "TextBoost AI: failed to read selection: " + error);
        return;
    }
    
    if (!result || !result.text.trim()) {
        notify(tab.id, "TextBoost AI: select some text inside an editable field first.");
        return;
    }

    const selected = result.text.trim();
    const elementInfo = result.elementInfo;

    try {
        const prompt = buildPrompt(action, selected);
        pageLog(tab.id, prompt);
        const rewritten = await callModel(prompt);
        pageLog(tab.id, rewritten);
        if (!rewritten) {
            notify(tab.id, "TextBoost AI: AI returned no content.");
            return;
        }

        // UPDATED: Pass both replacement text and element info
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: replaceTextInElement,
            args: [rewritten, elementInfo]
        });

        notify(tab.id, "TextBoost AI: replaced selection.");
    } catch (e) {
        notify(tab.id, "TextBoost AI error: " + (e?.message || e));
    }
});

function buildPrompt(action, text) {
    const base = `You are a rewriting assistant. Output plain text only (no markdown fences or quotes). Do not explain, do not comment, do not roleplay. Only return the rewritten version of the given text. Preserve meaning.`;

    if (action === "ai-better-write") {
        return `${base}\n\nTask: Rewrite the text to be clearer, fixing grammar and punctuation while keeping the same tone and meaning. Return only the rewritten text.\n\n----\n${text}\n----`;
    }

    if (action === "ai-summarize") {
        return `${base}\n\nTask: Rewrite the text into a shorter version, no more than 1–2 sentences. It must read like the original message condensed, not a description of it. Return only the summary text.\n\n----\n${text}\n----`;
    }

    if (action === "ai-expand") {
        return `${base}\n\nTask: Rewrite the text into a more detailed and professional version, adding helpful context while preserving the intent. Return only the expanded text.\n\n----\n${text}\n----`;
    }

    return text;
}

async function callGemini(userText, apiKey, model, temperature) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: userText }]
            }
        ],
        generationConfig: { temperature }
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t}`);
    }
    const data = await res.json();
    const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join("\n");
    return (text || "").trim();
}

async function callOpenRouter(userText, apiKey, model, temperature) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
        model,
        messages: [{ role: 'user', content: userText }],
        temperature
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t}`);
    }
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content || '').trim();
}

async function callModel(userText) {
    const settings = await getSettings();
    const temperature = settings.temperature ?? 0.7;
    if (settings.provider === 'openrouter') {
        if (!settings.openrouterApiKey) throw new Error('OpenRouter API key is missing');
        return callOpenRouter(userText, settings.openrouterApiKey, settings.openrouterModel, temperature);
    }
    if (!settings.geminiApiKey) throw new Error('Gemini API key is missing');
    return callGemini(userText, settings.geminiApiKey, settings.geminiModel, temperature);
}

function notify(tabId, message) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: (msg) => {
            const el = document.createElement("div");
            el.textContent = msg;
            el.style.position = "fixed";
            el.style.zIndex = "2147483647";
            el.style.right = "12px";
            el.style.bottom = "12px";
            el.style.padding = "10px 12px";
            el.style.background = "rgba(0,0,0,0.8)";
            el.style.color = "#fff";
            el.style.font = "12px/1.4 system-ui, sans-serif";
            el.style.borderRadius = "8px";
            el.style.boxShadow = "0 4px 18px rgba(0,0,0,0.25)";
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2200);
        },
        args: [message]
    });
}

// UPDATED: Get both text and element info
function getSelectedEditableTextAndElement() {
    const ae = document.activeElement;
    
    // Handle TEXTAREA and INPUT elements
    if (ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && 
        (ae.type === "text" || ae.type === "search" || ae.type === "email" || 
         ae.type === "url" || ae.type === "tel")))) {
        const start = ae.selectionStart ?? 0;
        const end = ae.selectionEnd ?? 0;
        return {
            text: ae.value.substring(start, end),
            elementInfo: {
                type: 'input',
                tagName: ae.tagName,
                selectionStart: start,
                selectionEnd: end,
                // Store element properties instead of element reference (can't pass DOM elements between contexts)
                elementId: ae.id,
                elementName: ae.name,
                elementClass: ae.className,
                elementTagName: ae.tagName,
                elementType: ae.type
            }
        };
    }
    
    // Handle contenteditable elements
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
        return { text: "", elementInfo: null };
    }
    
    const selectedText = sel.toString();
    const range = sel.getRangeAt(0);
    
    // Find the contenteditable container
    let editableContainer = range.commonAncestorContainer;
    while (editableContainer && editableContainer.nodeType !== 1) {
        editableContainer = editableContainer.parentNode;
    }
    while (editableContainer && !editableContainer.isContentEditable) {
        editableContainer = editableContainer.parentNode;
    }
    
    return {
        text: selectedText,
        elementInfo: {
            type: 'contenteditable',
            // Store element properties and selection info
            elementId: editableContainer?.id,
            elementClass: editableContainer?.className,
            elementTagName: editableContainer?.tagName,
            elementAriaLabel: editableContainer?.getAttribute('aria-label'),
            elementDataAttributes: {
                lexicalEditor: editableContainer?.getAttribute('data-lexical-editor'),
                testId: editableContainer?.getAttribute('data-testid')
            },
            // Store selection boundaries
            selectionText: selectedText,
            rangeStartOffset: range.startOffset,
            rangeEndOffset: range.endOffset
        }
    };
}

// UPDATED: Replace text using element info
function replaceTextInElement(replacement, elementInfo) {
    if (!elementInfo) {
        console.error("No element info provided");
        return;
    }
    
    try {
        if (elementInfo.type === 'input') {
            // Re-find the input element using stored properties
            let element = document.activeElement;
            
            // Verify it's the same element or find it by properties
            if (!element || element.tagName !== elementInfo.elementTagName ||
                (elementInfo.elementId && element.id !== elementInfo.elementId)) {
                
                // Try to find by ID first
                if (elementInfo.elementId) {
                    element = document.getElementById(elementInfo.elementId);
                }
                
                // Fallback: find by tag and type
                if (!element) {
                    const inputs = document.querySelectorAll(elementInfo.elementTagName.toLowerCase());
                    element = Array.from(inputs).find(input => 
                        input.type === elementInfo.elementType &&
                        (!elementInfo.elementClass || input.className === elementInfo.elementClass)
                    );
                }
            }
            
            if (element) {
                const start = elementInfo.selectionStart;
                const end = elementInfo.selectionEnd;
                
                const before = element.value.slice(0, start);
                const after = element.value.slice(end);
                element.value = before + replacement + after;
                
                const newPos = before.length + replacement.length;
                element.setSelectionRange(newPos, newPos);
                element.dispatchEvent(new Event("input", { bubbles: true }));
                element.focus();
            }
            
        } else if (elementInfo.type === 'contenteditable') {
            // Re-find the contenteditable element
            let element = document.activeElement;
            
            // If active element doesn't match, search for it
            if (!element || !element.isContentEditable) {
                // Try by ID first
                if (elementInfo.elementId) {
                    element = document.getElementById(elementInfo.elementId);
                }
                
                // Try by aria-label
                if (!element && elementInfo.elementAriaLabel) {
                    element = document.querySelector(`[aria-label="${elementInfo.elementAriaLabel}"][contenteditable="true"]`);
                }
                
                // Try by data attributes
                if (!element && elementInfo.elementDataAttributes.lexicalEditor) {
                    element = document.querySelector('[contenteditable="true"][data-lexical-editor="true"]');
                }
                
                // Last resort: use any contenteditable in the page
                if (!element) {
                    element = document.querySelector('[contenteditable="true"]');
                }
            }
            
            if (element) {
                element.focus();
                
                // Select existing text if any
                const sel = window.getSelection();
                if (element.textContent.trim()) {
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                
                // Try execCommand first (most compatible)
                let success = false;
                try {
                    success = document.execCommand('insertText', false, replacement);
                } catch (e) {
                    console.warn("execCommand failed:", e);
                }
                
                // Fallback to DOM manipulation
                if (!success) {
                    try {
                        if (sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            range.deleteContents();
                            range.insertNode(document.createTextNode(replacement));
                        } else {
                            element.textContent = replacement;
                        }
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                    } catch (e) {
                        console.error("DOM manipulation failed:", e);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Text replacement failed:", e);
    }
}