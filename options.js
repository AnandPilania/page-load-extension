const DEFAULT_SETTINGS = {
    enableFab: true,
    autoTrack: true,
    showScore: true,
    consoleLog: false,
    blockedSites: [],
    fabPosition: 'bottom-right',
    colorStart: '#667eea',
    colorEnd: '#764ba2',
    overlayPosition: 'right',
    historyLimit: 100,
    loadGood: 1000,
    loadWarning: 3000,
    shortcutKey: 'P'
};

async function loadSettings() {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

    document.getElementById('enableFab').checked = settings.enableFab;
    document.getElementById('autoTrack').checked = settings.autoTrack;
    document.getElementById('showScore').checked = settings.showScore;
    document.getElementById('consoleLog').checked = settings.consoleLog;
    document.getElementById('blockedSites').value = settings.blockedSites.join('\n');
    document.getElementById('fabPosition').value = settings.fabPosition;
    document.getElementById('colorStart').value = settings.colorStart;
    document.getElementById('colorEnd').value = settings.colorEnd;
    document.getElementById('overlayPosition').value = settings.overlayPosition;
    document.getElementById('historyLimit').value = settings.historyLimit;
    document.getElementById('loadGood').value = settings.loadGood;
    document.getElementById('loadWarning').value = settings.loadWarning;
    document.getElementById('shortcutKey').value = settings.shortcutKey;
}

async function saveSettings() {
    const blockedSitesText = document.getElementById('blockedSites').value;
    const blockedSites = blockedSitesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const settings = {
        enableFab: document.getElementById('enableFab').checked,
        autoTrack: document.getElementById('autoTrack').checked,
        showScore: document.getElementById('showScore').checked,
        consoleLog: document.getElementById('consoleLog').checked,
        blockedSites: blockedSites,
        fabPosition: document.getElementById('fabPosition').value,
        colorStart: document.getElementById('colorStart').value,
        colorEnd: document.getElementById('colorEnd').value,
        overlayPosition: document.getElementById('overlayPosition').value,
        historyLimit: parseInt(document.getElementById('historyLimit').value),
        loadGood: parseInt(document.getElementById('loadGood').value),
        loadWarning: parseInt(document.getElementById('loadWarning').value),
        shortcutKey: document.getElementById('shortcutKey').value
    };

    await chrome.storage.sync.set(settings);
    showToast();
}

async function resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
        await chrome.storage.sync.set(DEFAULT_SETTINGS);
        await loadSettings();
        showToast('Settings reset to defaults!');
    }
}

function showToast(message = 'Settings saved successfully!') {
    const toast = document.getElementById('toast');
    toast.querySelector('span:last-child').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);

document.querySelectorAll('.preset-color').forEach(preset => {
    preset.addEventListener('click', () => {
        document.getElementById('colorStart').value = preset.dataset.start;
        document.getElementById('colorEnd').value = preset.dataset.end;
    });
});
