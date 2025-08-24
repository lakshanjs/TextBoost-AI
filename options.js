document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
document.getElementById('provider').addEventListener('change', updateVisibility);

function updateVisibility() {
  const provider = document.getElementById('provider').value;
  document.querySelectorAll('.provider-settings').forEach(el => el.style.display = 'none');
  const active = document.getElementById(provider + '-settings');
  if (active) active.style.display = 'block';
}

function save() {
  const data = {
    provider: document.getElementById('provider').value,
    geminiApiKey: document.getElementById('geminiApiKey').value,
    geminiModel: document.getElementById('geminiModel').value || 'gemini-2.5-flash-lite',
    openrouterApiKey: document.getElementById('openrouterApiKey').value,
    openrouterModel: document.getElementById('openrouterModel').value || 'openrouter/auto',
    temperature: parseFloat(document.getElementById('temperature').value) || 0.7
  };
  chrome.storage.sync.set(data, () => {
    const status = document.getElementById('status');
    status.textContent = 'Saved!';
    setTimeout(() => status.textContent = '', 2000);
  });
}

function restore() {
  chrome.storage.sync.get({
    provider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash-lite',
    openrouterApiKey: '',
    openrouterModel: 'openrouter/auto',
    temperature: 0.7
  }, items => {
    document.getElementById('provider').value = items.provider;
    document.getElementById('geminiApiKey').value = items.geminiApiKey;
    document.getElementById('geminiModel').value = items.geminiModel;
    document.getElementById('openrouterApiKey').value = items.openrouterApiKey;
    document.getElementById('openrouterModel').value = items.openrouterModel;
    document.getElementById('temperature').value = items.temperature;
    updateVisibility();
  });
}
