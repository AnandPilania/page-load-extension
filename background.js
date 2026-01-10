chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'savePerformance') {
        savePerformanceData(request.data);
    } else if (request.action === 'getPerformance') {
        getPerformanceData().then(data => {
            sendResponse({ data });
        });
        return true;
    } else if (request.action === 'clearData') {
        clearPerformanceData().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

async function savePerformanceData(metrics) {
    try {
        const result = await chrome.storage.local.get(['performanceHistory']);
        let history = result.performanceHistory || [];

        history.unshift(metrics);

        if (history.length > 100) {
            history = history.slice(0, 100);
        }

        await chrome.storage.local.set({ performanceHistory: history });
        console.log('Performance data saved:', metrics);
    } catch (error) {
        console.error('Error saving performance data:', error);
    }
}

async function getPerformanceData() {
    try {
        const result = await chrome.storage.local.get(['performanceHistory']);
        return result.performanceHistory || [];
    } catch (error) {
        console.error('Error getting performance data:', error);
        return [];
    }
}

async function clearPerformanceData() {
    try {
        await chrome.storage.local.set({ performanceHistory: [] });
        console.log('Performance data cleared');
    } catch (error) {
        console.error('Error clearing performance data:', error);
    }
}
