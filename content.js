(function () {
    let metricsData = null;
    let overlayVisible = false;
    let settings = {
        enableFab: true,
        autoTrack: true,
        showScore: true,
        consoleLog: false,
        extensionMode: 'allowlist',
        allowedSites: ['*.niitmtscrm.com', '*.niitls.com', '*.test'],
        blockedSites: [],
        fabPosition: 'bottom-right',
        colorStart: '#667eea',
        colorEnd: '#764ba2',
        overlayPosition: 'right',
        historyLimit: 100,
        loadGood: 1000,
        loadWarning: 3000,
        shortcutKey: 'P',
        enableAlerts: false,
        loadTimeBudget: 3000,
        fcpBudget: 2000,
        pageSizeBudget: 2000,
        resourceBudget: 100,
        enableRegressionDetection: false,
        regressionThreshold: 25
    };

    async function loadSettings() {
        try {
            const stored = await chrome.storage.sync.get(settings);
            settings = { ...settings, ...stored };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    function isSiteAllowed() {
        const currentUrl = window.location.href;
        
        if (settings.extensionMode === 'all') {
            return true; 
        }
        
        if (settings.extensionMode === 'allowlist') {
            return settings.allowedSites.some(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                    return regex.test(currentUrl);
                }
                return currentUrl.includes(pattern);
            });
        }
        
        if (settings.extensionMode === 'blocklist') {
            return !settings.blockedSites.some(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                    return regex.test(currentUrl);
                }
                return currentUrl.includes(pattern);
            });
        }
        
        return false;
    }

    function getHttpVersion(protocol) {
        if (!protocol) return 'Unknown';
        if (protocol.includes('1.1')) return 'HTTP/1.1';
        if (protocol.includes('2')) return 'HTTP/2';
        if (protocol.includes('3')) return 'HTTP/3';
        return protocol;
    }

    function identifyBottlenecks(navigationEntry, resources) {
        const bottlenecks = [];
        
        const dnsTime = navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart;
        if (dnsTime > 100) {
            bottlenecks.push({ type: 'DNS', time: dnsTime, severity: dnsTime > 300 ? 'high' : 'medium' });
        }
        
        const connectTime = navigationEntry.connectEnd - navigationEntry.connectStart;
        if (connectTime > 200) {
            bottlenecks.push({ type: 'Connection', time: connectTime, severity: connectTime > 500 ? 'high' : 'medium' });
        }
        
        const serverTime = navigationEntry.responseStart - navigationEntry.requestStart;
        if (serverTime > 500) {
            bottlenecks.push({ type: 'Server Response', time: serverTime, severity: serverTime > 2000 ? 'high' : 'medium' });
        }
        
        const slowResources = resources.filter(r => r.duration > 1000).slice(0, 3);
        slowResources.forEach(resource => {
            bottlenecks.push({ 
                type: 'Slow Resource', 
                name: resource.name.split('/').pop(), 
                time: Math.round(resource.duration), 
                severity: resource.duration > 3000 ? 'high' : 'medium' 
            });
        });
        
        return bottlenecks;
    }

    function calculateCacheHitRate(resources) {
        const totalResources = resources.length;
        if (totalResources === 0) return 0;
        
        const cachedResources = resources.filter(r => {
            return r.transferSize === 0 && r.decodedBodySize > 0;
        }).length;
        
        return Math.round((cachedResources / totalResources) * 100);
    }

    function checkMixedContent() {
        if (window.location.protocol !== 'https:') return false;
        
        const images = document.images;
        const scripts = document.scripts;
        const links = document.links;
        
        for (let img of images) {
            if (img.src && img.src.startsWith('http:')) return true;
        }
        
        for (let script of scripts) {
            if (script.src && script.src.startsWith('http:')) return true;
        }
        
        for (let link of links) {
            if (link.href && link.href.startsWith('http:')) return true;
        }
        
        return false;
    }

    function checkPerformanceBudgets(metrics) {
        if (!settings.enableAlerts) return;

        const violations = [];

        if (metrics.totalLoadTime > settings.loadTimeBudget) {
            violations.push({
                type: 'Load Time',
                actual: metrics.totalLoadTime,
                budget: settings.loadTimeBudget,
                unit: 'ms',
                severity: metrics.totalLoadTime > settings.loadTimeBudget * 1.5 ? 'high' : 'medium'
            });
        }

        if (metrics.firstContentfulPaint > settings.fcpBudget) {
            violations.push({
                type: 'First Contentful Paint',
                actual: metrics.firstContentfulPaint,
                budget: settings.fcpBudget,
                unit: 'ms',
                severity: metrics.firstContentfulPaint > settings.fcpBudget * 1.5 ? 'high' : 'medium'
            });
        }

        const pageSizeKB = Math.round(metrics.totalTransferSize / 1024);
        if (pageSizeKB > settings.pageSizeBudget) {
            violations.push({
                type: 'Page Size',
                actual: pageSizeKB,
                budget: settings.pageSizeBudget,
                unit: 'KB',
                severity: pageSizeKB > settings.pageSizeBudget * 1.5 ? 'high' : 'medium'
            });
        }

        if (metrics.resourceCount > settings.resourceBudget) {
            violations.push({
                type: 'Resource Count',
                actual: metrics.resourceCount,
                budget: settings.resourceBudget,
                unit: 'resources',
                severity: metrics.resourceCount > settings.resourceBudget * 1.5 ? 'high' : 'medium'
            });
        }

        if (violations.length > 0) {
            showPerformanceAlerts(violations);
        }
    }

    async function checkRegression(metrics) {
        if (!settings.enableRegressionDetection) return;

        try {
            const domain = new URL(metrics.url).hostname;
            const result = await chrome.storage.local.get({ [`history_${domain}`]: [] });
            const domainHistory = result[`history_${domain}`] || [];

            if (domainHistory.length < 3) return;

            const recentGood = domainHistory
                .slice(-10)
                .filter(item => item && item.totalLoadTime && item.totalLoadTime < settings.loadTimeBudget)
                .slice(-5);

            if (recentGood.length < 2) return;

            const baseline = recentGood.reduce((sum, item) => sum + item.totalLoadTime, 0) / recentGood.length;
            const current = metrics.totalLoadTime;
            const regressionThreshold = baseline * (1 + settings.regressionThreshold / 100);

            if (current > regressionThreshold) {
                showRegressionAlert(current, baseline, settings.regressionThreshold);
            }
        } catch (error) {
            console.error('Error checking regression:', error);
        }
    }

    function showPerformanceAlerts(violations) {
        violations.forEach(violation => {
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${violation.severity === 'high' ? '#e53e3e' : '#ed8936'};
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            
            alertDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">
                    🚨 Performance Budget Exceeded
                </div>
                <div style="font-size: 13px;">
                    ${violation.type}: ${violation.actual}${violation.unit} (budget: ${violation.budget}${violation.unit})
                </div>
            `;

            document.body.appendChild(alertDiv);

            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 8000);
        });
    }

    function showRegressionAlert(current, baseline, threshold) {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e53e3e;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;
        
        alertDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">
                📉 Performance Regression Detected
            </div>
            <div style="font-size: 13px;">
                Load time increased by ${Math.round(((current - baseline) / baseline) * 100)}%<br>
                Current: ${current}ms | Baseline: ${Math.round(baseline)}ms
            </div>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 10000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(${settings.overlayPosition === 'left' ? '-100%' : '100%'}); }
            to { transform: translateX(0); }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); }
            to { transform: translateX(${settings.overlayPosition === 'left' ? '-100%' : '100%'}); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .perf-tracker-overlay.dark-mode {
            background: #1a202c !important;
            color: #e2e8f0 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-metric {
            background: #2d3748 !important;
            color: #e2e8f0 !important;
            border-color: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-metric-label {
            color: #a0aec0 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-metric-value {
            color: #e2e8f0 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-section-title {
            color: #e2e8f0 !important;
            border-color: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-waterfall-container {
            background: #2d3748 !important;
            border-color: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-waterfall-bar {
            border-color: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-alert {
            background: #2d3748 !important;
            color: #e2e8f0 !important;
            border-color: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-alert.high {
            background: #742a2a !important;
            border-color: #c53030 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-alert.medium {
            background: #744210 !important;
            border-color: #d69e2e !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-alert.low {
            background: #234e52 !important;
            border-color: #38a169 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-progress-fill {
            background: #4a5568 !important;
        }
        
        .perf-tracker-overlay.dark-mode .perf-progress-bar {
            background: #2d3748 !important;
            border-color: #4a5568 !important;
        }
    `;
    
    if (document.head) {
        document.head.appendChild(style);
    } else {
        const head = document.getElementsByTagName('head')[0];
        if (head) {
            head.appendChild(style);
        }
    }

    function capturePerformance() {
        if (!performance) {
            if (settings.consoleLog) console.log('Performance API not available');
            return;
        }

        window.addEventListener('load', () => {
            setTimeout(async () => {
                if (!isSiteAllowed() || !settings.autoTrack) {
                    if (settings.consoleLog) console.log('Performance tracking disabled for this site');
                    return;
                }
                const navigationEntry = performance.getEntriesByType('navigation')[0];

                if (!navigationEntry) {
                    if (settings.consoleLog) console.log('Navigation timing not available');
                    return;
                }

                const resources = performance.getEntriesByType('resource');
                const resourcesByType = {};
                let totalResourceSize = 0;
                let totalEncodedSize = 0;
                let totalDecodedSize = 0;

                resources.forEach(resource => {
                    const type = resource.initiatorType || 'other';
                    if (!resourcesByType[type]) {
                        resourcesByType[type] = { count: 0, transferSize: 0, encodedSize: 0, decodedSize: 0, duration: 0 };
                    }
                    resourcesByType[type].count++;
                    resourcesByType[type].duration += resource.duration;

                    if (resource.transferSize !== undefined) {
                        resourcesByType[type].transferSize += resource.transferSize;
                        totalResourceSize += resource.transferSize;
                    }

                    if (resource.encodedBodySize !== undefined) {
                        resourcesByType[type].encodedSize += resource.encodedBodySize;
                        totalEncodedSize += resource.encodedBodySize;
                    }

                    if (resource.decodedBodySize !== undefined) {
                        resourcesByType[type].decodedSize += resource.decodedBodySize;
                        totalDecodedSize += resource.decodedBodySize;
                    }
                });

                const documentFinishTime = navigationEntry.responseEnd - navigationEntry.fetchStart;
                const fullLoadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;

                let longestResourceTime = 0;
                resources.forEach(resource => {
                    const resourceFinish = resource.responseEnd;
                    if (resourceFinish > longestResourceTime) {
                        longestResourceTime = resourceFinish;
                    }
                });

                const metrics = {
                    url: window.location.href,
                    timestamp: new Date().toISOString(),

                    documentFinishTime: Math.round(documentFinishTime),
                    queuedTime: Math.round(navigationEntry.fetchStart - navigationEntry.startTime),
                    stalledTime: Math.round(navigationEntry.domainLookupStart - navigationEntry.fetchStart),
                    dnsLookupTime: Math.round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
                    initialConnection: Math.round(navigationEntry.connectEnd - navigationEntry.connectStart),
                    sslNegotiation: navigationEntry.secureConnectionStart > 0
                        ? Math.round(navigationEntry.connectEnd - navigationEntry.secureConnectionStart)
                        : 0,
                    requestSentTime: Math.round(navigationEntry.requestStart - navigationEntry.connectEnd),
                    waitingForServerResponse: Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
                    contentDownload: Math.round(navigationEntry.responseEnd - navigationEntry.responseStart),

                    fullLoadTime: Math.round(fullLoadTime),
                    longestResourceTime: Math.round(longestResourceTime),

                    domainLookup: Math.round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
                    tcpConnection: Math.round(navigationEntry.connectEnd - navigationEntry.connectStart),
                    sslHandshake: navigationEntry.secureConnectionStart > 0
                        ? Math.round(navigationEntry.connectEnd - navigationEntry.secureConnectionStart)
                        : 0,
                    requestTime: Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
                    responseTime: Math.round(navigationEntry.responseEnd - navigationEntry.responseStart),
                    domProcessing: Math.round(navigationEntry.domComplete - navigationEntry.domInteractive),
                    domContentLoaded: Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart),
                    domContentLoadedTime: Math.round(navigationEntry.domContentLoadedEventStart - navigationEntry.fetchStart),
                    totalLoadTime: Math.round(fullLoadTime),

                    timeToFirstByte: Math.round(navigationEntry.responseStart - navigationEntry.fetchStart),
                    domInteractive: Math.round(navigationEntry.domInteractive - navigationEntry.fetchStart),
                    redirectTime: Math.round(navigationEntry.redirectEnd - navigationEntry.redirectStart),
                    cacheTime: Math.round(navigationEntry.domainLookupStart - navigationEntry.fetchStart),

                    resourceCount: resources.length,
                    resourcesByType: resourcesByType,
                    slowResources: resources.filter(r => r.duration > 1000).length,
                    failedResources: resources.filter(r => r.responseStatus >= 400).length,

                    totalTransferSize: totalResourceSize + (navigationEntry.transferSize || 0),
                    totalEncodedSize: totalEncodedSize + (navigationEntry.encodedBodySize || 0),
                    totalDecodedSize: totalDecodedSize + (navigationEntry.decodedBodySize || 0),
                    documentTransferSize: navigationEntry.transferSize || 0,
                    documentEncodedSize: navigationEntry.encodedBodySize || 0,
                    documentDecodedSize: navigationEntry.decodedBodySize || 0,

                    compressionRatio: totalDecodedSize > 0
                        ? ((totalDecodedSize - totalEncodedSize) / totalDecodedSize * 100).toFixed(1)
                        : 0,

                    navigationType: navigationEntry.type || 'unknown',
                    redirectCount: navigationEntry.redirectCount || 0,
                    protocol: navigationEntry.nextHopProtocol || 'unknown',
                    httpVersion: getHttpVersion(navigationEntry.nextHopProtocol),

                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                        heapUsagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)
                    } : null,

                    connectionInfo: navigator.connection ? {
                        effectiveType: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt,
                        saveData: navigator.connection.saveData
                    } : null,

                    renderTime: Math.round(navigationEntry.loadEventEnd - navigationEntry.domContentLoadedEventEnd),
                    backendTime: Math.round(navigationEntry.responseStart - navigationEntry.fetchStart),
                    frontendTime: Math.round(navigationEntry.loadEventEnd - navigationEntry.responseStart),
                    domNodes: document.getElementsByTagName('*').length,
                    imagesCount: document.images.length,
                    scriptsCount: document.scripts.length,
                    stylesheetsCount: document.styleSheets.length,
                    iframesCount: document.getElementsByTagName('iframe').length,

                    bottlenecks: identifyBottlenecks(navigationEntry, resources),

                    cacheHitRate: calculateCacheHitRate(resources),

                    isSecure: window.location.protocol === 'https:',
                    hasMixedContent: checkMixedContent(),

                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    devicePixelRatio: window.devicePixelRatio || 1,

                    timingBreakdown: {
                        dns: Math.round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
                        tcp: Math.round(navigationEntry.connectEnd - navigationEntry.connectStart),
                        ssl: navigationEntry.secureConnectionStart > 0 
                            ? Math.round(navigationEntry.connectEnd - navigationEntry.secureConnectionStart) 
                            : 0,
                        ttfb: Math.round(navigationEntry.responseStart - navigationEntry.requestStart),
                        download: Math.round(navigationEntry.responseEnd - navigationEntry.responseStart),
                        domParse: Math.round(navigationEntry.domInteractive - navigationEntry.responseEnd),
                        domReady: Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.domInteractive),
                        load: Math.round(navigationEntry.loadEventEnd - navigationEntry.domContentLoadedEventEnd)
                    }
                };

                const paintEntries = performance.getEntriesByType('paint');
                paintEntries.forEach(entry => {
                    if (entry.name === 'first-paint') {
                        metrics.firstPaint = Math.round(entry.startTime);
                    } else if (entry.name === 'first-contentful-paint') {
                        metrics.firstContentfulPaint = Math.round(entry.startTime);
                    }
                });

                try {
                    const lcpObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        metrics.largestContentfulPaint = Math.round(lastEntry.renderTime || lastEntry.loadTime);
                    });
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                    // LCP not supported
                }

                metricsData = metrics;

                if (settings.consoleLog) {
                    console.log('Performance metrics captured:', metrics);
                }

                checkPerformanceBudgets(metrics);

                checkRegression(metrics);

                chrome.runtime.sendMessage({
                    action: 'savePerformance',
                    data: metrics
                });

                if (settings.enableFab) {
                    createFloatingButton();
                }
            }, 100);
        });
    }

    function createShareButton() {
        const shareButton = document.createElement('div');
        shareButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 80px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            font-size: 20px;
            color: white;
            font-weight: 600;
        `;
        
        shareButton.innerHTML = '📤';
        shareButton.title = 'Share Performance Report';
        
        shareButton.addEventListener('click', () => {
            sharePerformanceReport();
        });
        
        document.body.appendChild(shareButton);
    }

    function sharePerformanceReport() {
        if (!metricsData) {
            alert('⏳ No performance data available yet. Please wait for page to fully load.');
            return;
        }

        const shareOptions = {
            '1': '📸 Share as Screenshot',
            '2': '📋 Share as HTML Report',
            '3': '📊 Share as PDF',
            '4': '📋 Share as JSON Data'
        };

        const choice = prompt('Choose sharing option:\n\n' + Object.entries(shareOptions).map(([key, value]) => `${key}. ${value}`).join('\n\n') + '\n\nEnter choice (1-4):');

        if (!choice || !shareOptions[choice]) return;

        switch (choice) {
            case '1':
                shareAsScreenshot();
                break;
            case '2':
                shareAsHTML();
                break;
            case '3':
                shareAsPDF();
                break;
            case '4':
                shareAsJSON();
                break;
            default:
                alert('❌ Invalid choice. Please try again.');
        }
    }

    function calculatePerformanceScore(metrics) {
        let score = 100;
        
        if (metrics.totalLoadTime > 3000) score -= 30;
        else if (metrics.totalLoadTime > 1000) score -= 15;
        
        if (metrics.firstContentfulPaint > 2500) score -= 20;
        else if (metrics.firstContentfulPaint > 1000) score -= 10;
        
        if (metrics.timeToFirstByte > 600) score -= 15;
        else if (metrics.timeToFirstByte > 200) score -= 5;
        
        if (metrics.resourceCount > 100) score -= 10;
        else if (metrics.resourceCount > 50) score -= 5;
        
        return Math.max(0, score);
    }

    function shareAsScreenshot() {
        try {
            if (!metricsData) {
                alert('⏳ No performance data available yet. Please wait for page to fully load.');
                return;
            }

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            `;
            
            content.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #667eea; margin: 0;">📊 Performance Report</h2>
                    <p style="color: #718096; margin: 10px 0 0 0;">Generating screenshot...</p>
                </div>
            `;
            
            overlay.appendChild(content);
            document.body.appendChild(overlay);
            
            setTimeout(() => {
                if (typeof html2canvas === 'undefined') {
                    alert('❌ html2canvas library not available. Please install html2canvas or use a different browser.');
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    return;
                }

                html2canvas(document.body, {
                    backgroundColor: '#ffffff',
                    scale: 1,
                    logging: false
                }).then(canvas => {
                    canvas.toBlob(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        setTimeout(() => {
                            if (overlay.parentNode) {
                                overlay.parentNode.removeChild(overlay);
                            }
                        }, 1000);
                    });
                });
            }, 500);
        } catch (error) {
            console.error('Error sharing screenshot:', error);
            alert('❌ Failed to create screenshot. Please try again.');
        }
    }

    function shareAsHTML() {
        try {
            if (!metricsData) {
                alert('⏳ No performance data available yet. Please wait for page to fully load.');
                return;
            }

            const overlay = document.getElementById('perf-tracker-overlay');
            if (!overlay) {
                alert('⏳ Please open the performance overlay first.');
                return;
            }

            const overlayContent = overlay.cloneNode(true);
            
            const controls = overlayContent.querySelector('.perf-header-controls');
            if (controls) controls.remove();
            
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${new URL(window.location.href).hostname}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #2d3748;
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .report-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .report-header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .report-content {
            padding: 30px;
        }
        .report-footer {
            background: #f7fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .report-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>📊 Performance Analytics Report</h1>
            <p>Generated on ${new Date().toLocaleString()} for ${window.location.href}</p>
        </div>
        <div class="report-content">
            ${overlayContent.innerHTML}
        </div>
        <div class="report-footer">
            <p>Report generated by Performance Analytics Extension</p>
        </div>
    </div>
</body>
</html>`;
            
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-report-${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✅ HTML report exported successfully!');
        } catch (error) {
            console.error('Error sharing HTML:', error);
            alert('❌ Failed to export HTML report. Please try again.');
        }
    }

    function shareAsJSON() {
        try {
            if (!metricsData) {
                alert('⏳ No performance data available yet. Please wait for page to fully load.');
                return;
            }

            const m = metricsData.m || metricsData;
            const jsonData = {
                metadata: {
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                },
                performance: metricsData
            };
            
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✅ JSON data exported successfully!');
        } catch (error) {
            console.error('Error sharing JSON:', error);
            alert('❌ Failed to export JSON data. Please try again.');
        }
    }

    function shareAsPDF() {
        try {
            if (!metricsData) {
                alert('⏳ No performance data available yet. Please wait for page to fully load.');
                return;
            }

            const overlay = document.getElementById('perf-tracker-overlay');
            if (!overlay) {
                alert('⏳ Please open the performance overlay first.');
                return;
            }

            const overlayContent = overlay.cloneNode(true);
            
            const controls = overlayContent.querySelector('.perf-header-controls');
            if (controls) controls.remove();
            
            const printContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${new URL(window.location.href).hostname}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #2d3748;
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .report-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .report-header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .report-content {
            padding: 30px;
        }
        .report-footer {
            background: #f7fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .report-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>📊 Performance Analytics Report</h1>
            <p>Generated on ${new Date().toLocaleString()} for ${window.location.href}</p>
        </div>
        <div class="report-content">
            ${overlayContent.innerHTML}
        </div>
        <div class="report-footer">
            <p>Report generated by Performance Analytics Extension</p>
        </div>
    </div>
</body>
</html>`;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
                alert('📋 PDF generation initiated. Use browser print to save as PDF.');
            }, 1000);
        } catch (error) {
            console.error('Error sharing PDF:', error);
            alert('❌ Failed to create PDF. Please try again.');
        }
    }

    function generateHTMLReport() {
        if (!metricsData) return '<html><body><h1>No performance data available</h1></body></html>';
        
        const m = metricsData.m || metricsData;
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${new URL(window.location.href).hostname}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #2d3748;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        .header h1 {
            margin: 0;
            color: #667eea;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            color: #718096;
            margin: 10px 0 0 0;
            font-size: 14px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .metric-title {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 15px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 14px;
            color: #718096;
        }
        .good { color: #48bb78; }
        .medium { color: #ed8936; }
        .bad { color: #e53e3e; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Performance Report</h1>
        <p><strong>${new URL(window.location.href).hostname}</strong> | ${new Date().toLocaleString()}</p>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-title">⏱️ Total Load Time</div>
            <div class="metric-value ${m.totalLoadTime <= 1000 ? 'good' : m.totalLoadTime <= 3000 ? 'medium' : 'bad'}">${m.totalLoadTime}ms</div>
            <div class="metric-label">Page Load Completion</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🎨 First Contentful Paint</div>
            <div class="metric-value ${m.firstContentfulPaint <= 1000 ? 'good' : m.firstContentfulPaint <= 2500 ? 'medium' : 'bad'}">${m.firstContentfulPaint}ms</div>
            <div class="metric-label">Content First Appearance</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🚀 Time to First Byte</div>
            <div class="metric-value ${m.timeToFirstByte <= 200 ? 'good' : m.timeToFirstByte <= 600 ? 'medium' : 'bad'}">${m.timeToFirstByte}ms</div>
            <div class="metric-label">Server Response Time</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">📦 Resource Count</div>
            <div class="metric-value">${m.resourceCount}</div>
            <div class="metric-label">Total Resources Loaded</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">📊 Page Size</div>
            <div class="metric-value">${formatBytes(m.totalTransferSize)}</div>
            <div class="metric-label">Total Data Transferred</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🎯 Performance Score</div>
            <div class="metric-value ${calculatePerformanceScore(m) >= 90 ? 'good' : calculatePerformanceScore(m) >= 70 ? 'medium' : 'bad'}">${calculatePerformanceScore(m)}/100</div>
            <div class="metric-label">Overall Performance Rating</div>
        </div>
    </div>

    <div class="footer">
        <p>Generated by Performance Tracker Extension | ${new Date().toISOString()}</p>
    </div>
</body>
</html>
`;
    }

    function createOverlay() {
        if (document.getElementById('perf-tracker-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'perf-tracker-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            ${settings.overlayPosition === 'left' ? 'left: 0; right: auto;' : 'right: 0; left: auto;'}
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            transition: transform 0.3s ease;
            transform: translateX(${settings.overlayPosition === 'left' ? '-100%' : '100%'});
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            position: sticky;
            top: 0;
            z-index: 10;
        `;

        const title = document.createElement('h2');
        title.textContent = '⚡ Performance Analytics';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        `;

        const headerControls = document.createElement('div');
        headerControls.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const shareButton = document.createElement('button');
        shareButton.innerHTML = '📤';
        shareButton.title = 'Share Performance Report';
        shareButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            padding: 6px 10px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        `;
        shareButton.addEventListener('click', sharePerformanceReport);
        shareButton.addEventListener('mouseenter', () => {
            shareButton.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        shareButton.addEventListener('mouseleave', () => {
            shareButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        const darkModeToggle = document.createElement('button');
        darkModeToggle.innerHTML = '🌙';
        darkModeToggle.title = 'Toggle Dark Mode';
        darkModeToggle.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            padding: 6px 10px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        `;
        darkModeToggle.addEventListener('click', toggleDarkMode);
        darkModeToggle.addEventListener('mouseenter', () => {
            darkModeToggle.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        darkModeToggle.addEventListener('mouseleave', () => {
            darkModeToggle.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.title = 'Close';
        closeButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            padding: 6px 10px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        `;
        closeButton.addEventListener('click', closeOverlay);
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        headerControls.appendChild(shareButton);
        headerControls.appendChild(darkModeToggle);
        headerControls.appendChild(closeButton);

        header.appendChild(title);
        header.appendChild(headerControls);

        const content = document.createElement('div');
        content.id = 'perf-tracker-content';
        content.style.cssText = `
            padding: 20px;
        `;

        overlay.appendChild(header);
        overlay.appendChild(content);

        document.body.appendChild(overlay);

        chrome.storage.sync.get(['darkMode'], (result) => {
            const overlay = document.getElementById('perf-tracker-overlay');
            const darkBtn = document.getElementById('perf-dark-btn');
            
            if (result.darkMode) {
                overlay.classList.add('dark-mode');
                if (darkBtn) darkBtn.innerHTML = '☀️';
            }
        });

        setTimeout(() => {
            overlay.style.transform = 'translateX(0)';
        }, 10);

        displayMetrics();
    }

    function toggleDarkMode() {
        const overlay = document.getElementById('perf-tracker-overlay');
        const darkModeToggle = document.querySelector('[title="Toggle Dark Mode"]');
        
        if (overlay.classList.contains('dark-mode')) {
            overlay.classList.remove('dark-mode');
            darkModeToggle.innerHTML = '🌙';
            chrome.storage.sync.set({ darkMode: false });
        } else {
            overlay.classList.add('dark-mode');
            darkModeToggle.innerHTML = '☀️';
            chrome.storage.sync.set({ darkMode: true });
        }
    }

    function createFloatingButton() {
        if (document.getElementById('perf-tracker-fab')) return;

        const positions = {
            'bottom-right': 'bottom: 30px; right: 30px;',
            'bottom-left': 'bottom: 30px; left: 30px;',
            'top-right': 'top: 30px; right: 30px;',
            'top-left': 'top: 30px; left: 30px;'
        };

        const fab = document.createElement('div');
        fab.id = 'perf-tracker-fab';
        fab.innerHTML = `
      <style>
        #perf-tracker-fab {
          position: fixed;
          ${positions[settings.fabPosition]}
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, ${settings.colorStart} 0%, ${settings.colorEnd} 100%);
          border-radius: 50%;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          cursor: pointer;
          z-index: 999998;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          animation: fadeInBounce 0.6s ease-out;
        }
        #perf-tracker-fab:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
        #perf-tracker-fab:active {
          transform: scale(0.95);
        }
        @keyframes fadeInBounce {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        #perf-tracker-fab .tooltip {
          position: absolute;
          ${settings.fabPosition.includes('right') ? 'right: 70px; left: auto;' : 'left: 70px; right: auto;'}
          background: rgba(0,0,0,0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: normal;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        #perf-tracker-fab:hover .tooltip {
          opacity: 1;
        }
      </style>
      <span class="tooltip">Performance Stats (Ctrl+Shift+${settings.shortcutKey})</span>
      ⚡
    `;

        document.body.appendChild(fab);

        fab.addEventListener('click', toggleOverlay);
    }

    function createNetworkWaterfall(resources) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const title = document.createElement('div');
        title.textContent = '🌊 Network Waterfall (Top 20 Resources)';
        title.style.cssText = `
            font-weight: 600;
            margin-bottom: 10px;
            color: #f7fafc;
            font-size: 14px;
        `;

        const waterfall = document.createElement('div');
        waterfall.style.cssText = `
            position: relative;
            height: 200px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            overflow: hidden;
        `;

        const sortedResources = resources
            .filter(r => r.duration > 0)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 20);

        const maxDuration = Math.max(...sortedResources.map(r => r.duration));
        const waterfallWidth = 100;
        const rowHeight = 8;

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

        container.appendChild(title);
        container.appendChild(waterfall);
        return container;
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
function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    function getColorClass(value, good, bad) {
            if (value <= good) return 'good';
            if (value <= bad) return 'medium';
            return 'bad';
        }

    function closeOverlay() {
        const overlay = document.getElementById('perf-tracker-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    function toggleDarkMode() {
        const overlay = document.getElementById('perf-tracker-overlay');
        const darkBtn = document.getElementById('perf-dark-btn');
        
        if (overlay.classList.contains('dark-mode')) {
            overlay.classList.remove('dark-mode');
            if (darkBtn) darkBtn.innerHTML = '🌙';
            chrome.storage.sync.set({ darkMode: false });
        } else {
            overlay.classList.add('dark-mode');
            if (darkBtn) darkBtn.innerHTML = '☀️';
            chrome.storage.sync.set({ darkMode: true });
        }
    }

    function createOverlay() {
        if (document.getElementById('perf-tracker-overlay')) return;

        const overlayPosition = settings.overlayPosition === 'left' 
            ? 'left: 0; right: auto; box-shadow: 5px 0 30px rgba(0,0,0,0.2);'
            : 'right: 0; left: auto; box-shadow: -5px 0 30px rgba(0,0,0,0.2);';

        const overlay = document.createElement('div');
        overlay.id = 'perf-tracker-overlay';
        overlay.innerHTML = `
      <style>
        #perf-tracker-overlay {
          position: fixed;
          top: 0;
          ${overlayPosition}
          width: 450px;
          height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          z-index: 999999;
          overflow: hidden;
          display: none;
        }
        #perf-tracker-overlay.visible {
          display: flex;
          flex-direction: column;
          animation: ${settings.overlayPosition === 'left' ? 'slideInLeft' : 'slideInRight'} 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .perf-header-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 8px;
          z-index: 2;
        }
        .perf-share-btn, .perf-dark-btn, .perf-close {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .perf-share-btn:hover, .perf-dark-btn:hover, .perf-close:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.1);
        }
        .perf-header {
          background: linear-gradient(135deg, ${settings.colorStart} 0%, ${settings.colorEnd} 100%);
          color: white;
          padding: 25px 20px;
          position: relative;
          overflow: hidden;
        }
        .perf-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .perf-header-content {
          position: relative;
          z-index: 1;
        }
        .perf-header h3 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .perf-header p {
          margin: 0;
          font-size: 13px;
          opacity: 0.95;
          font-weight: 400;
        }
        .perf-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .perf-close:hover {
          background: rgba(255,255,255,0.3);
          transform: rotate(90deg) scale(1.1);
        }
        .perf-quick-stats {
          background: white;
          margin: -15px 20px 0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          position: relative;
          z-index: 1;
        }
        .perf-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .perf-quick-item {
          text-align: center;
        }
        .perf-quick-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .perf-quick-label {
          font-size: 11px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .perf-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        .perf-content::-webkit-scrollbar {
          width: 8px;
        }
        .perf-content::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .perf-content::-webkit-scrollbar-thumb {
          background: #667eea;
          border-radius: 4px;
        }
        .perf-content::-webkit-scrollbar-thumb:hover {
          background: #5a67d8;
        }
        .perf-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }
        .perf-section:hover {
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }
        .perf-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .perf-section-title::before {
          content: '';
          width: 4px;
          height: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
        }
        .perf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .perf-metric {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 15px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .perf-metric:hover {
          border-color: #667eea;
          transform: translateY(-2px);
        }
        .perf-metric::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
        }
        .perf-metric-label {
          font-size: 11px;
          color: #718096;
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .perf-metric-value {
          font-size: 20px;
          font-weight: 700;
          color: #2d3748;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .perf-metric-unit {
          font-size: 12px;
          color: #a0aec0;
          font-weight: 500;
        }
        .perf-metric-value.good { color: #38a169; }
        .perf-metric-value.medium { color: #dd6b20; }
        .perf-metric-value.bad { color: #e53e3e; }
        .perf-full {
          grid-column: 1 / -1;
        }
        .perf-resource-list {
          margin-top: 12px;
        }
        .perf-resource-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #f7fafc;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 12px;
          transition: all 0.2s;
        }
        .perf-resource-item:hover {
          background: #edf2f7;
          transform: translateX(4px);
        }
        .perf-resource-item:last-child {
          margin-bottom: 0;
        }
        .perf-resource-type {
          font-weight: 600;
          color: #4a5568;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .perf-resource-badge {
          background: #667eea;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        .perf-resource-stats {
          color: #718096;
          font-weight: 500;
        }
        .perf-progress-bar {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 8px;
        }
        .perf-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .perf-score {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }
        .perf-score-value {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .perf-score-label {
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
      <div class="perf-header">
        <div class="perf-header-controls">
          <button class="perf-share-btn" id="perf-share-btn" title="Share Performance Report">📤</button>
          <button class="perf-dark-btn" id="perf-dark-btn" title="Toggle Dark Mode">🌙</button>
          <button class="perf-close" id="perf-close-btn">×</button>
        </div>
        <div class="perf-header-content">
          <h3><span>⚡</span> Performance Analytics</h3>
          <p>Real-time page performance monitoring</p>
        </div>
      </div>
      <div class="perf-quick-stats" id="perf-quick-stats"></div>
      <div class="perf-content" id="perf-content">
        <div style="text-align: center; padding: 40px 20px; color: #a0aec0;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <div style="font-size: 14px;">Loading performance data...</div>
        </div>
      <div class="perf-section">
        <div class="perf-section-title">📊 Resource Breakdown</div>
        <div class="perf-resource-list">
          ${Object.entries(metricsData.resourcesByType)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, data]) => `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>${type}</span>
                <span class="perf-resource-badge">${data.count}</span>
              </div>
              <div class="perf-resource-stats">${formatBytes(data.transferSize)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

        if (metricsData && metricsData.resources && metricsData.resources.length > 0) {
            try {
                const waterfallSection = createNetworkWaterfall(metricsData.resources);
                if (waterfallSection && overlay) {
                    overlay.innerHTML += waterfallSection.outerHTML;
                }
            } catch (error) {
                console.error('Error creating waterfall:', error);
            }
        }

        document.body.appendChild(overlay);

        try {
            const closeBtn = document.getElementById('perf-close-btn');
            const shareBtn = document.getElementById('perf-share-btn');
            const darkBtn = document.getElementById('perf-dark-btn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', closeOverlay);
            }
            
            if (shareBtn) {
                shareBtn.addEventListener('click', sharePerformanceReport);
            }
            
            if (darkBtn) {
                darkBtn.addEventListener('click', toggleDarkMode);
            }
        } catch (error) {
            console.error('Error adding header button listeners:', error);
        }

        try {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeOverlay();
                }
            });
        } catch (error) {
            console.error('Error setting up keyboard listener:', error);
        }
    }

    function showOverlay() {
        if (!metricsData) {
            alert('⏳ No performance data available yet. Please wait for the page to fully load.');
            return;
        }

        createOverlay();
        const overlay = document.getElementById('perf-tracker-overlay');
        overlay.classList.add('visible');
        overlayVisible = true;

        updateOverlayContent();
    }

    function hideOverlay() {
        const overlay = document.getElementById('perf-tracker-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            overlayVisible = false;
        }
    }

    function toggleOverlay() {
        if (overlayVisible) {
            hideOverlay();
        } else {
            showOverlay();
        }
    }

    function updateOverlayContent() {
        const quickStats = document.getElementById('perf-quick-stats');
        const content = document.getElementById('perf-content');
        if (!content || !metricsData) return;

        const m = metricsData;

        function calculateScore() {
            let score = 100;
            if (m.totalLoadTime > settings.loadWarning) score -= 20;
            else if (m.totalLoadTime > settings.loadGood) score -= 10;

            if (m.firstContentfulPaint > 2500) score -= 15;
            else if (m.firstContentfulPaint > 1000) score -= 7;

            if (m.timeToFirstByte > 600) score -= 15;
            else if (m.timeToFirstByte > 200) score -= 7;

            return Math.max(0, score);
        }

        const score = calculateScore();

        quickStats.innerHTML = `
      <div class="perf-quick-grid">
        <div class="perf-quick-item">
          <div class="perf-quick-value ${getColorClass(m.documentFinishTime, settings.loadGood, settings.loadWarning)}">${(m.documentFinishTime / 1000).toFixed(2)}s</div>
          <div class="perf-quick-label">Document Finish</div>
        </div>
        <div class="perf-quick-item">
          <div class="perf-quick-value">${m.resourceCount}</div>
          <div class="perf-quick-label">Resources</div>
        </div>
        <div class="perf-quick-item">
          <div class="perf-quick-value">${formatBytes(m.totalTransferSize)}</div>
          <div class="perf-quick-label">Transferred</div>
        </div>
      </div>
    `;

        let html = `
      ${settings.showScore ? `
      <div class="perf-section">
        <div class="perf-score">
          <div class="perf-score-value">${score}</div>
          <div class="perf-score-label">Performance Score</div>
        </div>
      </div>` : ''}

      <div class="perf-section">
        <div class="perf-section-title">Core Web Vitals</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Total Load</div>
            <div class="perf-metric-value ${getColorClass(m.totalLoadTime, settings.loadGood, settings.loadWarning)}">
              ${m.totalLoadTime}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.totalLoadTime / 5000) * 100)}%"></div>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">DOM Loaded</div>
            <div class="perf-metric-value ${getColorClass(m.domContentLoadedTime, settings.loadGood, settings.loadWarning)}">
              ${m.domContentLoadedTime}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.domContentLoadedTime / 3000) * 100)}%"></div>
            </div>
          </div>
          ${m.firstContentfulPaint ? `
          <div class="perf-metric">
            <div class="perf-metric-label">First Paint</div>
            <div class="perf-metric-value ${getColorClass(m.firstContentfulPaint, 1000, 2500)}">
              ${m.firstContentfulPaint}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.firstContentfulPaint / 4000) * 100)}%"></div>
            </div>
          </div>` : ''}
          ${m.largestContentfulPaint ? `
          <div class="perf-metric">
            <div class="perf-metric-label">Largest Paint</div>
            <div class="perf-metric-value ${getColorClass(m.largestContentfulPaint, 2500, 4000)}">
              ${m.largestContentfulPaint}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.largestContentfulPaint / 5000) * 100)}%"></div>
            </div>
          </div>` : ''}
          <div class="perf-metric">
            <div class="perf-metric-label">First Byte</div>
            <div class="perf-metric-value ${getColorClass(m.timeToFirstByte, 200, 600)}">
              ${m.timeToFirstByte}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.timeToFirstByte / 1000) * 100)}%"></div>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Interactive</div>
            <div class="perf-metric-value ${getColorClass(m.domInteractive, 1000, 3000)}">
              ${m.domInteractive}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.domInteractive / 4000) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">Network Timeline</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">DNS Lookup</div>
            <div class="perf-metric-value">${m.domainLookup}<span class="perf-metric-unit">ms</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">TCP Connect</div>
            <div class="perf-metric-value">${m.tcpConnection}<span class="perf-metric-unit">ms</span></div>
          </div>
          ${m.sslHandshake > 0 ? `
          <div class="perf-metric">
            <div class="perf-metric-label">SSL/TLS</div>
            <div class="perf-metric-value">${m.sslHandshake}<span class="perf-metric-unit">ms</span></div>
          </div>` : ''}
          <div class="perf-metric">
            <div class="perf-metric-label">Request</div>
            <div class="perf-metric-value">${m.requestTime}<span class="perf-metric-unit">ms</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Response</div>
            <div class="perf-metric-value">${m.responseTime}<span class="perf-metric-unit">ms</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">DOM Process</div>
            <div class="perf-metric-value">${m.domProcessing}<span class="perf-metric-unit">ms</span></div>
          </div>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">Page Size Analysis</div>
        <div class="perf-grid">
          <div class="perf-metric perf-full">
            <div class="perf-metric-label">Total Transferred (with headers)</div>
            <div class="perf-metric-value">${formatBytes(m.totalTransferSize)}</div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: 100%"></div>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Encoded Size (compressed)</div>
            <div class="perf-metric-value">${formatBytes(m.totalEncodedSize)}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Decoded Size (uncompressed)</div>
            <div class="perf-metric-value">${formatBytes(m.totalDecodedSize)}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Compression Saved</div>
            <div class="perf-metric-value good">${m.compressionRatio}%</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Document Size</div>
            <div class="perf-metric-value">${formatBytes(m.documentTransferSize)}</div>
          </div>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">Navigation Info</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Navigation Type</div>
            <div class="perf-metric-value" style="font-size: 14px; text-transform: capitalize;">${m.navigationType}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Protocol</div>
            <div class="perf-metric-value" style="font-size: 14px;">${m.protocol.toUpperCase()}</div>
          </div>
          ${m.redirectCount > 0 ? `
          <div class="perf-metric">
            <div class="perf-metric-label">Redirects</div>
            <div class="perf-metric-value">${m.redirectCount}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Redirect Time</div>
            <div class="perf-metric-value">${m.redirectTime}<span class="perf-metric-unit">ms</span></div>
          </div>` : ''}
          ${m.cacheTime > 0 ? `
          <div class="perf-metric">
            <div class="perf-metric-label">Cache Lookup</div>
            <div class="perf-metric-value">${m.cacheTime}<span class="perf-metric-unit">ms</span></div>
          </div>` : ''}
        </div>
      </div>

      ${m.connectionInfo ? `
      <div class="perf-section">
        <div class="perf-section-title">🌐 Connection & Environment</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Network Type</div>
            <div class="perf-metric-value" style="font-size: 14px; text-transform: uppercase;">${m.connectionInfo.effectiveType}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Downlink</div>
            <div class="perf-metric-value">${m.connectionInfo.downlink}<span class="perf-metric-unit">Mbps</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">RTT</div>
            <div class="perf-metric-value">${m.connectionInfo.rtt}<span class="perf-metric-unit">ms</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Data Saver</div>
            <div class="perf-metric-value" style="font-size: 14px;">${m.connectionInfo.saveData ? 'ON' : 'OFF'}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Protocol</div>
            <div class="perf-metric-value" style="font-size: 14px;">${m.httpVersion}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Security</div>
            <div class="perf-metric-value ${m.isSecure ? 'good' : 'bad'}" style="font-size: 14px;">
              ${m.isSecure ? '🔒 HTTPS' : '⚠️ HTTP'}
              ${m.hasMixedContent ? ' (Mixed Content)' : ''}
            </div>
          </div>
        </div>
      </div>` : ''}

      <div class="perf-section">
        <div class="perf-section-title">🐛 Developer Metrics</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Backend Time</div>
            <div class="perf-metric-value ${getColorClass(m.backendTime, 500, 1500)}">
              ${m.backendTime}<span class="perf-metric-unit">ms</span>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Frontend Time</div>
            <div class="perf-metric-value ${getColorClass(m.frontendTime, 500, 1500)}">
              ${m.frontendTime}<span class="perf-metric-unit">ms</span>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">DOM Nodes</div>
            <div class="perf-metric-value">${m.domNodes.toLocaleString()}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Images</div>
            <div class="perf-metric-value">${m.imagesCount}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Scripts</div>
            <div class="perf-metric-value">${m.scriptsCount}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Stylesheets</div>
            <div class="perf-metric-value">${m.stylesheetsCount}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">iFrames</div>
            <div class="perf-metric-value">${m.iframesCount}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Cache Hit Rate</div>
            <div class="perf-metric-value ${getColorClass(100 - m.cacheHitRate, 20, 50)}">
              ${m.cacheHitRate}<span class="perf-metric-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">⚠️ Performance Issues</div>
        <div class="perf-resource-list">
          ${m.slowResources > 0 ? `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>🐌 Slow Resources</span>
                <span class="perf-resource-badge">${m.slowResources}</span>
              </div>
              <div class="perf-resource-stats">Taking >1s each</div>
            </div>
          ` : ''}
          ${m.failedResources > 0 ? `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>❌ Failed Resources</span>
                <span class="perf-resource-badge" style="background: #e53e3e;">${m.failedResources}</span>
              </div>
              <div class="perf-resource-stats">HTTP 4xx/5xx</div>
            </div>
          ` : ''}
          ${m.bottlenecks.length > 0 ? m.bottlenecks.map(bottleneck => `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>${bottleneck.severity === 'high' ? '🚨' : '⚠️'} ${bottleneck.type}</span>
                <span class="perf-resource-badge" style="background: ${bottleneck.severity === 'high' ? '#e53e3e' : '#dd6b20'}">${bottleneck.time}ms</span>
              </div>
              <div class="perf-resource-stats">${bottleneck.name || 'Performance bottleneck'}</div>
            </div>
          `).join('') : `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>✅ No Bottlenecks</span>
              </div>
              <div class="perf-resource-stats">All metrics within acceptable ranges</div>
            </div>
          `}
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">📊 Resource Breakdown</div>
        <div class="perf-resource-list">
          ${Object.entries(m.resourcesByType)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, data]) => `
            <div class="perf-resource-item">
              <div class="perf-resource-type">
                <span>${type}</span>
                <span class="perf-resource-badge">${data.count}</span>
              </div>
              <div class="perf-resource-stats">${formatBytes(data.transferSize)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${m.memory ? `
      <div class="perf-section">
        <div class="perf-section-title">Memory Usage</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">JS Heap Used</div>
            <div class="perf-metric-value">${formatBytes(m.memory.usedJSHeapSize)}</div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${(m.memory.usedJSHeapSize / m.memory.totalJSHeapSize) * 100}%"></div>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">JS Heap Total</div>
            <div class="perf-metric-value">${formatBytes(m.memory.totalJSHeapSize)}</div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${(m.memory.totalJSHeapSize / m.memory.jsHeapSizeLimit) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>` : ''}
    `;

        content.innerHTML = html;
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === settings.shortcutKey) {
            e.preventDefault();
            toggleOverlay();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleOverlay') {
            toggleOverlay();
        } else if (request.action === 'settingsChanged') {
            loadSettings().then(() => {
                const existingFab = document.getElementById('perf-tracker-fab');
                if (existingFab) {
                    existingFab.remove();
                }
                if (settings.enableFab && isSiteAllowed()) {
                    createFloatingButton();
                }
            });
        }
    });

    chrome.storage.sync.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.enableFab) {
                const existingFab = document.getElementById('perf-tracker-fab');
                if (existingFab) {
                    existingFab.remove();
                }
                if (changes.enableFab.newValue && isSiteAllowed()) {
                    createFloatingButton();
                }
            }
        }
    });

    loadSettings().then(() => {
        if (isSiteAllowed()) {
            capturePerformance();
        }
    });
})();
