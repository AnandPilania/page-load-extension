(function () {
    let metricsData = null;
    let overlayVisible = false;

    function capturePerformance() {
        if (!performance) {
            console.log('Performance API not available');
            return;
        }

        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigationEntry = performance.getEntriesByType('navigation')[0];

                if (!navigationEntry) {
                    console.log('Navigation timing not available');
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

                    resourceCount: resources.length,
                    resourcesByType: resourcesByType,

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

                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                    } : null,

                    connectionInfo: navigator.connection ? {
                        effectiveType: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt,
                        saveData: navigator.connection.saveData
                    } : null
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

                chrome.runtime.sendMessage({
                    action: 'savePerformance',
                    data: metrics
                });

                createFloatingButton();
            }, 100);
        });
    }

    function createFloatingButton() {
        if (document.getElementById('perf-tracker-fab')) return;

        const fab = document.createElement('div');
        fab.id = 'perf-tracker-fab';
        fab.innerHTML = `
      <style>
        #perf-tracker-fab {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          right: 70px;
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
      <span class="tooltip">Performance Stats (Ctrl+Shift+P)</span>
      ⚡
    `;

        document.body.appendChild(fab);

        fab.addEventListener('click', toggleOverlay);
    }

    function createOverlay() {
        if (document.getElementById('perf-tracker-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'perf-tracker-overlay';
        overlay.innerHTML = `
      <style>
        #perf-tracker-overlay {
          position: fixed;
          top: 0;
          right: 0;
          width: 450px;
          height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
          box-shadow: -5px 0 30px rgba(0,0,0,0.2);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          z-index: 999999;
          overflow: hidden;
          display: none;
        }
        #perf-tracker-overlay.visible {
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .perf-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        <button class="perf-close" id="perf-close-btn">×</button>
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
      </div>
    `;

        document.body.appendChild(overlay);

        document.getElementById('perf-close-btn').addEventListener('click', hideOverlay);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlayVisible) {
                hideOverlay();
            }
        });
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

        function getColorClass(value, good, bad) {
            if (value <= good) return 'good';
            if (value <= bad) return 'medium';
            return 'bad';
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        function calculateScore() {
            let score = 100;
            if (m.totalLoadTime > 3000) score -= 20;
            else if (m.totalLoadTime > 1000) score -= 10;

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
          <div class="perf-quick-value ${getColorClass(m.documentFinishTime, 1000, 3000)}">${(m.documentFinishTime / 1000).toFixed(2)}s</div>
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
      <div class="perf-section">
        <div class="perf-score">
          <div class="perf-score-value">${score}</div>
          <div class="perf-score-label">Performance Score</div>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-section-title">Core Web Vitals</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Total Load</div>
            <div class="perf-metric-value ${getColorClass(m.totalLoadTime, 1000, 3000)}">
              ${m.totalLoadTime}<span class="perf-metric-unit">ms</span>
            </div>
            <div class="perf-progress-bar">
              <div class="perf-progress-fill" style="width: ${Math.min(100, (m.totalLoadTime / 5000) * 100)}%"></div>
            </div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">DOM Loaded</div>
            <div class="perf-metric-value ${getColorClass(m.domContentLoadedTime, 800, 2000)}">
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
        <div class="perf-section-title">Connection Info</div>
        <div class="perf-grid">
          <div class="perf-metric">
            <div class="perf-metric-label">Network Type</div>
            <div class="perf-metric-value" style="font-size: 14px; text-transform: uppercase;">${m.connectionInfo.effectiveType}</div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Downlink Speed</div>
            <div class="perf-metric-value">${m.connectionInfo.downlink}<span class="perf-metric-unit">Mbps</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Round Trip Time</div>
            <div class="perf-metric-value">${m.connectionInfo.rtt}<span class="perf-metric-unit">ms</span></div>
          </div>
          <div class="perf-metric">
            <div class="perf-metric-label">Data Saver</div>
            <div class="perf-metric-value" style="font-size: 14px;">${m.connectionInfo.saveData ? 'ON' : 'OFF'}</div>
          </div>
        </div>
      </div>` : ''}

      <div class="perf-section">
        <div class="perf-section-title">Resource Breakdown</div>
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
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            toggleOverlay();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleOverlay') {
            toggleOverlay();
        }
    });

    capturePerformance();
})();
