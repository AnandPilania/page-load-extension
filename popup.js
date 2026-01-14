document.addEventListener('DOMContentLoaded', () => {
    loadSettingsAndData();

    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
        applyDarkMode(e.target.checked);
        chrome.storage.sync.set({ darkMode: e.target.checked });
    });

    chrome.storage.sync.get(['darkMode'], (result) => {
        if (result.darkMode !== undefined) {
            applyDarkMode(result.darkMode);
            document.getElementById('darkModeToggle').checked = result.darkMode;
        }
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadSettingsAndData();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        exportPerformanceData();
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

async function exportPerformanceData() {
    chrome.runtime.sendMessage({ action: 'getPerformance' }, (response) => {
        if (response && response.data) {
            const data = response.data;
            
            const exportOptions = {
                csv: 'Export as CSV',
                json: 'Export as JSON',
                cancel: 'Cancel'
            };
            
            const choice = Object.keys(exportOptions).find(key => 
                confirm(`${exportOptions[key]}?\n\nOK for ${exportOptions[key]}, Cancel for other options`)
            );
            
            if (choice === 'cancel') {
                const option = prompt('Choose export format:\n1. CSV\n2. JSON\n\nEnter number (1 or 2):');
                if (option === '1') exportAsCSV(data);
                else if (option === '2') exportAsJSON(data);
            } else if (choice) {
                if (choice === 'csv') exportAsCSV(data);
                else if (choice === 'json') exportAsJSON(data);
            }
        }
    });
}

function exportAsCSV(data) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = [
        'Timestamp', 'URL', 'Domain', 'Document Finish Time (ms)', 'Full Load Time (ms)',
        'DOM Loaded Time (ms)', 'First Contentful Paint (ms)', 'Largest Contentful Paint (ms)',
        'Time to First Byte (ms)', 'Backend Time (ms)', 'Frontend Time (ms)',
        'Total Transfer Size (bytes)', 'Resource Count', 'Cache Hit Rate (%)',
        'DOM Nodes', 'Images Count', 'Scripts Count', 'Stylesheets Count',
        'Navigation Type', 'HTTP Version', 'Is Secure', 'Has Mixed Content',
        'Network Type', 'Downlink (Mbps)', 'RTT (ms)'
    ];
    
    const rows = data.map(item => [
        item.timestamp,
        item.url,
        new URL(item.url).hostname,
        item.documentFinishTime || '',
        item.totalLoadTime || '',
        item.domContentLoadedTime || '',
        item.firstContentfulPaint || '',
        item.largestContentfulPaint || '',
        item.timeToFirstByte || '',
        item.backendTime || '',
        item.frontendTime || '',
        item.totalTransferSize || '',
        item.resourceCount || '',
        item.cacheHitRate || '',
        item.domNodes || '',
        item.imagesCount || '',
        item.scriptsCount || '',
        item.stylesheetsCount || '',
        item.navigationType || '',
        item.httpVersion || '',
        item.isSecure || '',
        item.hasMixedContent || '',
        item.connectionInfo?.effectiveType || '',
        item.connectionInfo?.downlink || '',
        item.connectionInfo?.rtt || ''
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    downloadFile(csvContent, 'performance-data.csv', 'text/csv');
}

function exportAsJSON(data) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            totalRecords: data.length,
            dateRange: {
                earliest: data[0]?.timestamp,
                latest: data[data.length - 1]?.timestamp
            },
            version: '1.0.0'
        },
        performanceData: data
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'performance-data.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function getColorClass(value, good, bad) {
        if (value <= good) return 'good';
        if (value <= bad) return 'medium';
        return 'bad';
    }

function applyDarkMode(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

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
                displayCharts(response.data);
                displayBudgetStatus(response.data);
                displayRegressionStatus(response.data);
                displayNetworkWaterfall(response.data);
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

function displayCharts(data) {
    if (!data || data.length < 2) {
        document.getElementById('chartsSection').style.display = 'none';
        return;
    }

    document.getElementById('chartsSection').style.display = 'block';
    
    const canvas = document.getElementById('performanceChart');
    const ctx = canvas.getContext('2d');
    
    const recentData = data.slice(-10);
    
    const labels = recentData.map((_, index) => `P${index + 1}`);
    const loadTimes = recentData.map(item => item.totalLoadTime || 0);
    const fcpTimes = recentData.map(item => item.firstContentfulPaint || 0);
    const ttfbTimes = recentData.map(item => item.timeToFirstByte || 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 20;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);
    
    const maxValue = Math.max(...loadTimes, ...fcpTimes, ...ttfbTimes);
    const scale = maxValue > 0 ? chartHeight / maxValue : 1;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    const drawLine = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value * scale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        ctx.fillStyle = color;
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (value * scale);
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    };
    
    drawLine(loadTimes, '#667eea');
    drawLine(fcpTimes, '#48bb78');
    drawLine(ttfbTimes, '#ed8936');
}

    function displayBudgetStatus(data) {
        if (!data || data.length === 0) return;
        
        const latest = data[data.length - 1];
        const budgetViolations = [];
        
        if (latest.totalLoadTime > 3000) budgetViolations.push('Load Time');
        if (latest.firstContentfulPaint > 2000) budgetViolations.push('FCP');
        if (latest.totalTransferSize > 2048000) budgetViolations.push('Page Size'); 
        
        const budgetStatus = document.createElement('div');
        budgetStatus.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: ${budgetViolations.length > 0 ? '#fee2e2' : '#48bb78'};
            border-radius: 6px;
            color: white;
            font-size: 12px;
            margin-bottom: 5px;
        `;
        
        budgetStatus.innerHTML = `
            ${budgetViolations.length > 0 ? '⚠️' : '✅'} Performance Budgets
            ${budgetViolations.length > 0 ? `${budgetViolations.join(', ')} Exceeded` : 'All Within Limits'}
        `;
        
        const statsSection = document.querySelector('.stats-summary');
        if (statsSection) {
            statsSection.parentNode.insertBefore(budgetStatus, statsSection.nextSibling);
        }
    }

    function displayRegressionStatus(data) {
        if (!data || data.length < 3) return;
        
        const domain = new URL(data[data.length - 1].url).hostname;
        const domainHistory = data.filter(item => new URL(item.url).hostname === domain);
        
        if (domainHistory.length < 3) return;
        
        const recentGood = domainHistory
            .slice(-10)
            .filter(item => item.totalLoadTime < 3000)
            .slice(-5);
        
        if (recentGood.length < 2) return;
        
        const baseline = recentGood.reduce((sum, item) => sum + item.totalLoadTime, 0) / recentGood.length;
        const current = data[data.length - 1].totalLoadTime;
        const regressionThreshold = baseline * 1.25;
        
        const hasRegression = current > regressionThreshold;
        
        const regressionStatus = document.createElement('div');
        regressionStatus.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: ${hasRegression ? '#e53e3e' : '#48bb78'};
            border-radius: 6px;
            color: white;
            font-size: 12px;
            margin-bottom: 5px;
        `;
        
        regressionStatus.innerHTML = `
            ${hasRegression ? '📉' : '✅'} Performance Regression
            ${hasRegression ? `Detected (+${Math.round(((current - baseline) / baseline) * 100)}%)` : 'No Regression'}
        `;
        
        const budgetStatus = document.querySelector('.budget-status');
        if (budgetStatus) {
            budgetStatus.parentNode.insertBefore(regressionStatus, budgetStatus.nextSibling);
        }
    }

    function displayNetworkWaterfall(data) {
        if (!data || !data.resources || data.resources.length === 0) return;
        
        const sortedResources = data.resources
            .filter(r => r.duration > 0)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);
        
        const maxDuration = Math.max(...sortedResources.map(r => r.duration));
        const waterfallWidth = 100;
        const rowHeight = 6;
        
        const waterfallSection = document.createElement('div');
        waterfallSection.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
            overflow: hidden;
        `;
        
        const title = document.createElement('div');
        title.textContent = '🌊 Network Waterfall (Top 10 Resources)';
        title.style.cssText = `
            font-weight: 600;
            margin-bottom: 10px;
            color: #f7fafc;
            font-size: 14px;
        `;
        
        const waterfall = document.createElement('div');
        waterfall.style.cssText = `
            position: relative;
            height: 120px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            overflow: hidden;
        `;
        
        sortedResources.forEach((resource, index) => {
            const resourceDiv = document.createElement('div');
            resourceDiv.style.cssText = `
                position: absolute;
                left: 0;
                top: ${index * rowHeight}px;
                width: ${(resource.duration / maxDuration) * waterfallWidth}%;
                height: ${rowHeight - 1}px;
                background: ${getResourceColor(resource.name)};
                border-radius: 2px;
                display: flex;
                align-items: center;
                padding: 0 8px;
                font-size: 10px;
                color: white;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;
            
            const resourceName = resource.name.split('/').pop() || resource.name;
            const duration = Math.round(resource.duration);
            resourceDiv.textContent = `${resourceName} (${duration}ms)`;
            resourceDiv.title = `${resourceName}: ${duration}ms`;
            
            waterfall.appendChild(resourceDiv);
        });
        
        waterfallSection.appendChild(title);
        waterfallSection.appendChild(waterfall);
        
        const budgetStatus = document.querySelector('.budget-status');
        if (budgetStatus) {
            budgetStatus.parentNode.insertBefore(waterfallSection, budgetStatus.nextSibling);
        }
    }

function getResourceColor(url) {
        const extension = url.split('.').pop()?.toLowerCase();
        const colors = {
            'js': '#f59e0b',
            'css': '#4299e1',
            'png': '#38b2ac',
            'jpg': '#38b2ac',
            'jpeg': '#38b2ac',
            'gif': '#38b2ac',
            'svg': '#38b2ac',
            'woff': '#9f7aea',
            'woff2': '#9f7aea',
            'ttf': '#9f7aea',
            'html': '#48bb78',
            'json': '#ed8936',
            'xml': '#ed8936'
        };
        return colors[extension] || '#718096';
    }

function displayData(data) {
    const content = document.getElementById('content');

    if (data.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px;">📊</div>
                <p>No performance data yet.<br>Visit some websites to start tracking!</p>
            </div>
        `;
        return;
    }

    const stats = calculateStats(data);
    
    let html = `
        <div class="stats-summary">
            <h2>📈 Performance Overview</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${data.length}</div>
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

    const groupedByDomain = groupByDomain(data.slice(0, 20));
    
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
