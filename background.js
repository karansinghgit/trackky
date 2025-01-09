let currentTab = null;
let startTime = null;
let lastActiveTime = null;

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
  try {
    // Save time for previous tab before switching
    if (currentTab) {
      await trackTime();
    }
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      currentTab = new URL(tab.url).hostname;
      startTime = Date.now();
      lastActiveTime = startTime;
      console.log('Tab activated:', { currentTab, startTime });
    }
  } catch (error) {
    console.error('Error in tab activation:', error);
    resetTracking();
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === "complete" && tab.active) {
      // Save time for previous tab before updating
      if (currentTab) {
        await trackTime();
      }
      
      if (tab.url) {
        currentTab = new URL(tab.url).hostname;
        startTime = Date.now();
        lastActiveTime = startTime;
        console.log('Tab updated:', { currentTab, startTime });
      }
    }
  } catch (error) {
    console.error('Error in tab update:', error);
    resetTracking();
  }
});

function resetTracking() {
  currentTab = null;
  startTime = null;
  lastActiveTime = null;
}

// Track time on the current tab
async function trackTime() {
  try {
    if (!currentTab || !startTime || !lastActiveTime) {
      return;
    }

    const currentTime = Date.now();
    const timeSpent = currentTime - lastActiveTime;
    
    // Ignore invalid time intervals
    if (timeSpent < 0 || timeSpent > DAY_IN_MS || isNaN(timeSpent)) {
      console.log('Invalid time interval detected:', {
        timeSpent,
        currentTab,
        startTime,
        lastActiveTime,
        currentTime
      });
      resetTracking();
      return;
    }
    
    const today = new Date().toLocaleDateString();
    const { dailyData = {} } = await chrome.storage.local.get('dailyData');
    
    if (!dailyData[today]) {
      dailyData[today] = {};
    }
    
    if (timeSpent > 0) {
      dailyData[today][currentTab] = (dailyData[today][currentTab] || 0) + timeSpent;
      
      await chrome.storage.local.set({ 
        dailyData: dailyData,
        currentDate: today
      });
      
      console.log('Updated time:', {
        site: currentTab,
        timeSpent,
        total: dailyData[today][currentTab]
      });
    }
    
    lastActiveTime = currentTime;
  } catch (error) {
    console.error('Error in trackTime:', error);
    resetTracking();
  }
}

// Check for day change and system inactivity
setInterval(async () => {
  try {
    // Track time for current tab periodically
    if (currentTab) {
      await trackTime();
    }

    const newDate = new Date().toLocaleDateString();
    if (newDate !== currentDate) {
      currentDate = newDate;
      await initializeDailyData();
    }
  } catch (error) {
    console.error('Error in interval check:', error);
    resetTracking();
  }
}, 1000); // Check every second for more accurate tracking

// Listen for system suspend/resume
chrome.idle.onStateChanged.addListener(async (state) => {
  console.log('System state changed:', {
    state,
    currentTab,
    startTime,
    lastActiveTime
  });
  
  try {
    if (state === 'active') {
      startTime = Date.now();
      lastActiveTime = startTime;
    } else {
      if (currentTab) {
        await trackTime();
      }
      resetTracking();
    }
  } catch (error) {
    console.error('Error in idle state change:', error);
    resetTracking();
  }
});

// Initialize on startup
initializeDailyData();

// Listen for browser closure
chrome.runtime.onSuspend.addListener(async () => {
  if (currentTab) {
    await trackTime();
  }
});
