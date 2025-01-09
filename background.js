let currentTab = null;
let startTime = null;
const data = {};

// Add daily tracking
const DAY_IN_MS = 24 * 60 * 60 * 1000;
let currentDate = new Date().toLocaleDateString();

// Initialize or load daily data
async function initializeDailyData() {
  const stored = await chrome.storage.local.get(['dailyData', 'currentDate']);
  if (stored.currentDate !== currentDate) {
    // New day, reset data
    await chrome.storage.local.set({
      dailyData: {},
      currentDate: currentDate
    });
  }
}

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await trackTime();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    currentTab = new URL(tab.url).hostname;
    startTime = Date.now();
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    await trackTime();
    if (tab.url) {
      currentTab = new URL(tab.url).hostname;
      startTime = Date.now();
    }
  }
});

// Track time on the current tab
async function trackTime() {
  if (currentTab && startTime) {
    const timeSpent = Date.now() - startTime;
    const { dailyData = {} } = await chrome.storage.local.get('dailyData');
    
    dailyData[currentTab] = (dailyData[currentTab] || 0) + timeSpent;
    
    // Store historical data
    const date = new Date().toLocaleDateString();
    const { historicalData = {} } = await chrome.storage.local.get('historicalData');
    
    if (!historicalData[date]) {
      historicalData[date] = {};
    }
    historicalData[date][currentTab] = (historicalData[date][currentTab] || 0) + timeSpent;
    
    // Clean up data older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    Object.keys(historicalData).forEach(date => {
      if (new Date(date) < thirtyDaysAgo) {
        delete historicalData[date];
      }
    });
    
    await chrome.storage.local.set({ dailyData, historicalData });
  }
}

// Check for day change periodically
setInterval(async () => {
  const newDate = new Date().toLocaleDateString();
  if (newDate !== currentDate) {
    currentDate = newDate;
    await initializeDailyData();
  }
}, 60000); // Check every minute

// Initialize on startup
initializeDailyData();

// Listen for browser closure
chrome.runtime.onSuspend.addListener(async () => {
  await trackTime();
});
