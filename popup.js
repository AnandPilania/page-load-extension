document.addEventListener('DOMContentLoaded', () => {
    loadSettingsAndData();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadSettingsAndData();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all performance history?')) {
            chrome.runtime.sendMessage({ action: 'clearData' }, () => {
                loadSettingsAndData();
            });
        }
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('quickEnableFab').addEventListener('change', (e) => {
        updateSetting('enableFab', e.target.checked);
    });

    document.getElementById('quickAutoTrack').addEventListener('change', (e) => {
        updateSetting('autoTrack', e.target.checked);
    });

    document.getElementById('quickShowScore').addEventListener('change', (e) => {
        updateSetting('showScore', e.target.checked);
    });
});

async function loadSettingsAndData() {
    try {
        const settings = await chrome.storage.sync.get({
            enableFab: true,
            autoTrack: true,
            showScore: true
        });

        document.getElementById('quickEnableFab').checked = settings.enableFab;
        document.getElementById('quickAutoTrack').checked = settings.autoTrack;
        document.getElementById('quickShowScore').checked = settings.showScore;

        chrome.runtime.sendMessage({ action: 'getPerformance' }, (response) => {
            if (response && response.data) {
                displayData(response.data);
            }
        });
    } catch (error) {
        console.error('Error loading settings and data:', error);
    }
}

async function updateSetting(key, value) {
    try {
        await chrome.storage.sync.set({ [key]: value });
        
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'settingsChanged' }).catch(() => {
                // Ignore errors for tabs that don't have content script
            });
        });
    } catch (error) {
        console.error('Error updating setting:', error);
    }
}

function displayData(history) {
    const content = document.getElementById('content');

    if (history.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px;">📊</div>
                <p>No performance data yet.<br>Visit some websites to start tracking!</p>
            </div>
        `;
        return;
    }

    const stats = calculateStats(history);
    
    let html = `
        <div class="stats-summary">
            <h2>📈 Performance Overview</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${history.length}</div>
                    <div class="stat-label">Pages Tracked</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.avgLoadTime}ms</div>
                    <div class="stat-label">Avg Load Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.uniqueSites}</div>
                    <div class="stat-label">Unique Sites</div>
                </div>
            </div>
        </div>

        <div class="history">
            <h2>🕐 Recent Activity</h2>
    `;

    const groupedByDomain = groupByDomain(history.slice(0, 20));
    
    Object.entries(groupedByDomain).forEach(([domain, entries]) => {
        html += `
            <div class="domain-group">
                <div style="font-size: 12px; font-weight: 600; color: #667eea; margin-bottom: 8px; padding: 8px; background: #f7fafc; border-radius: 4px;">
                    🌐 ${domain}
                </div>
        `;
        
        entries.forEach(item => {
            const timeAgo = getTimeAgo(new Date(item.timestamp));
            html += `
                <div class="history-item" title="${item.url}">
                    <div class="history-url">${extractPath(item.url)}</div>
                    <div class="history-stats">
                        <span>⏱️ ${item.totalLoadTime}ms</span>
                        <span>📄 ${item.domContentLoaded}ms</span>
                        <span>📦 ${item.resourceCount}</span>
                        <span>🕐 ${timeAgo}</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });

    html += `</div>`;
    content.innerHTML = html;
}

function calculateStats(history) {
    if (history.length === 0) return { avgLoadTime: 0, uniqueSites: 0 };
    
    const totalLoadTime = history.reduce((sum, item) => sum + item.totalLoadTime, 0);
    const avgLoadTime = Math.round(totalLoadTime / history.length);
    
    const uniqueDomains = new Set(history.map(item => new URL(item.url).hostname));
    const uniqueSites = uniqueDomains.size;
    
    return { avgLoadTime, uniqueSites };
}

function groupByDomain(history) {
    return history.reduce((groups, item) => {
        try {
            const domain = new URL(item.url).hostname;
            if (!groups[domain]) groups[domain] = [];
            groups[domain].push(item);
        } catch (e) {
            // Invalid URL, skip
        }
        return groups;
    }, {});
}

function extractPath(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
    } catch {
        return url;
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
