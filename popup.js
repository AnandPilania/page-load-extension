document.addEventListener('DOMContentLoaded', () => {
    loadPerformanceData();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadPerformanceData();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all performance history?')) {
            chrome.runtime.sendMessage({ action: 'clearData' }, () => {
                loadPerformanceData();
            });
        }
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});

function loadPerformanceData() {
    chrome.runtime.sendMessage({ action: 'getPerformance' }, (response) => {
        if (response && response.data) {
            displayData(response.data);
        }
    });
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

    const current = history[0];
    const older = history.slice(1, 11);

    let html = `
    <div class="current-page">
      <h2>Latest Page Load</h2>
      <div style="font-size: 11px; color: #718096; margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${current.url}">${current.url}</div>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-label">Total Load Time</div>
          <div class="metric-value ${getColorClass(current.totalLoadTime, 1000, 3000)}">${current.totalLoadTime}ms</div>
        </div>
        <div class="metric">
          <div class="metric-label">DOM Content Loaded</div>
          <div class="metric-value ${getColorClass(current.domContentLoaded, 800, 2000)}">${current.domContentLoaded}ms</div>
        </div>
        <div class="metric">
          <div class="metric-label">Time to First Byte</div>
          <div class="metric-value ${getColorClass(current.timeToFirstByte, 200, 600)}">${current.timeToFirstByte}ms</div>
        </div>
        <div class="metric">
          <div class="metric-label">DOM Processing</div>
          <div class="metric-value ${getColorClass(current.domProcessing, 500, 1500)}">${current.domProcessing}ms</div>
        </div>
        ${current.firstContentfulPaint ? `
        <div class="metric">
          <div class="metric-label">First Contentful Paint</div>
          <div class="metric-value ${getColorClass(current.firstContentfulPaint, 1000, 2500)}">${current.firstContentfulPaint}ms</div>
        </div>` : ''}
        <div class="metric">
          <div class="metric-label">Resources Loaded</div>
          <div class="metric-value">${current.resourceCount}</div>
        </div>
      </div>
    </div>
  `;

    if (older.length > 0) {
        html += `
      <div class="history">
        <h2>Recent History</h2>
        ${older.map(item => `
          <div class="history-item" title="${item.url}">
            <div class="history-url">${extractDomain(item.url)}</div>
            <div class="history-stats">
              <span>⏱️ ${item.totalLoadTime}ms</span>
              <span>📄 ${item.domContentLoaded}ms</span>
              <span>📦 ${item.resourceCount} resources</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    }

    content.innerHTML = html;
}

function getColorClass(value, goodThreshold, badThreshold) {
    if (value <= goodThreshold) return 'good';
    if (value <= badThreshold) return 'medium';
    return 'bad';
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname + urlObj.pathname;
    } catch {
        return url;
    }
}
