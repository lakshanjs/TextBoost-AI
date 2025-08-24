// TextBoost AI content script
// Logs relayed from background.js will show up in the page DevTools console.
chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'TB_LOG') {
        console.log('[TextBoost AI]', ...[].concat(msg.payload || []));
    }
});
