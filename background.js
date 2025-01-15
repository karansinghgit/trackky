let currentTab = null;
let startTime = null;
let lastActiveTime = null;
let activeWindowId = null;

// Add daily tracking
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

let currentDate = formatDate(new Date());

// Store data for the current day
async function storeData(data) {
  const today = formatDate(new Date());
  const { dailyData = {}, historicalData = {} } = await chrome.storage.local.get(['dailyData', 'historicalData']);
  
  // Check if we need to move today's data to historical
  const currentDate = await chrome.storage.local.get('currentDate');
  if (currentDate.currentDate && currentDate.currentDate !== today) {
    // Move yesterday's data to historical and remove from dailyData
    const yesterdayData = dailyData[currentDate.currentDate];
    if (yesterdayData) {
      historicalData[currentDate.currentDate] = yesterdayData;
      // Clean up any duplicate entries
      delete historicalData[today]; // Remove today's date from historical if it exists
      delete dailyData[currentDate.currentDate]; // Remove old date from daily
    }
  }
  
  // Update today's data in dailyData only
  dailyData[today] = {
    total: data.total || {},
    hourly: data.hourly || {}
  };
  
  // Remove today's date from historical if it exists
  delete historicalData[today];
  
  // Save everything back to storage
  await chrome.storage.local.set({
    dailyData,
    historicalData,
    currentDate: today
  });
}

// Initialize tracking data
async function initializeTracking() {
  const today = new Date().toLocaleDateString();
  const { dailyData = {}, historicalData = {}, currentDate } = await chrome.storage.local.get(['dailyData', 'historicalData', 'currentDate']);
  
  // Clean up any duplicate entries
  if (historicalData[today]) {
    delete historicalData[today]; // Remove today from historical
  }
  
  // If it's a new day, move yesterday's data to historical
  if (currentDate && currentDate !== today && dailyData[currentDate]) {
    historicalData[currentDate] = dailyData[currentDate];
    delete dailyData[currentDate];
    
    // Clean up dailyData to only contain today
    Object.keys(dailyData).forEach(date => {
      if (date !== today) {
        delete dailyData[date];
      }
    });
    
    await chrome.storage.local.set({
      dailyData,
      historicalData,
      currentDate: today
    });
  }
}

// Call initializeTracking when extension starts
chrome.runtime.onStartup.addListener(initializeTracking);
chrome.runtime.onInstalled.addListener(initializeTracking);

// Get the active tab from the active window
async function getActiveTab() {
  try {
    // Get all windows
    const windows = await chrome.windows.getAll({ populate: true });
    
    // Find the focused window
    const focusedWindow = windows.find(window => window.focused);
    
    if (focusedWindow) {
      // Get the active tab from the focused window
      const activeTab = focusedWindow.tabs.find(tab => tab.active);
      if (activeTab && activeTab.url) {
        return {
          url: new URL(activeTab.url).hostname,
          windowId: focusedWindow.id,
          tabId: activeTab.id
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting active tab:', error);
    return null;
  }
}

// Track time when window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  try {
    // Save time for previous tab
    if (currentTab) {
      await trackTime();
    }

    // Reset tracking if no window is focused (windowId === -1)
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      resetTracking();
      return;
    }

    // Update active window
    activeWindowId = windowId;
    
    // Get the new active tab
    const activeTab = await getActiveTab();
    if (activeTab) {
      currentTab = activeTab.url;
      startTime = Date.now();
      lastActiveTime = startTime;
      console.log('Window focus changed:', { currentTab, windowId });
    } else {
      resetTracking();
    }
  } catch (error) {
    console.error('Error in window focus change:', error);
    resetTracking();
  }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Only track if this tab is in the focused window
    const window = await chrome.windows.get(activeInfo.windowId);
    if (!window.focused) {
      return;
    }

    // Save time for previous tab
    if (currentTab) {
      await trackTime();
    }
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      currentTab = new URL(tab.url).hostname;
      startTime = Date.now();
      lastActiveTime = startTime;
      activeWindowId = tab.windowId;
      console.log('Tab activated:', { currentTab, startTime, windowId: tab.windowId });
    }
  } catch (error) {
    console.error('Error in tab activation:', error);
    resetTracking();
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Only track if this is the active tab in the focused window
    if (changeInfo.status === "complete" && tab.active) {
      const window = await chrome.windows.get(tab.windowId);
      if (!window.focused) {
        return;
      }

      // Save time for previous tab
      if (currentTab) {
        await trackTime();
      }
      
      if (tab.url) {
        currentTab = new URL(tab.url).hostname;
        startTime = Date.now();
        lastActiveTime = startTime;
        activeWindowId = tab.windowId;
        console.log('Tab updated:', { currentTab, startTime, windowId: tab.windowId });
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
    const currentHour = new Date().getHours();
    let { dailyData = {} } = await chrome.storage.local.get('dailyData');
    
    // Ensure dailyData exists
    if (!dailyData) {
      dailyData = {};
    }

    // Ensure today's data exists with the correct structure
    if (!dailyData[today] || typeof dailyData[today] !== 'object') {
      dailyData[today] = {
        hourly: {},
        total: {}
      };
    }

    // Ensure hourly and total objects exist with correct structure
    if (!dailyData[today].hourly || typeof dailyData[today].hourly !== 'object') {
      dailyData[today].hourly = {};
    }
    if (!dailyData[today].total || typeof dailyData[today].total !== 'object') {
      dailyData[today].total = {};
    }

    // Ensure current hour exists
    if (!dailyData[today].hourly[currentHour] || typeof dailyData[today].hourly[currentHour] !== 'object') {
      dailyData[today].hourly[currentHour] = {};
    }
    
    // Update hourly data
    dailyData[today].hourly[currentHour][currentTab] = 
      (dailyData[today].hourly[currentHour][currentTab] || 0) + timeSpent;
    
    // Update total for the day
    dailyData[today].total[currentTab] = 
      (dailyData[today].total[currentTab] || 0) + timeSpent;
    
    await chrome.storage.local.set({ 
      dailyData: dailyData,
      currentDate: today
    });
    
    console.log('Updated time:', {
      site: currentTab,
      hour: currentHour,
      timeSpent,
      hourlyTotal: dailyData[today].hourly[currentHour][currentTab],
      dailyTotal: dailyData[today].total[currentTab],
      structure: {
        hasToday: !!dailyData[today],
        hasHourly: !!dailyData[today]?.hourly,
        hasCurrentHour: !!dailyData[today]?.hourly?.[currentHour]
      }
    });
    
    lastActiveTime = currentTime;
  } catch (error) {
    console.error('Error in trackTime:', error, {
      currentTab,
      startTime,
      lastActiveTime,
      dailyData: await chrome.storage.local.get('dailyData')
    });
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
      await initializeTracking();
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
initializeTracking();

// Listen for browser closure
chrome.runtime.onSuspend.addListener(async () => {
  if (currentTab) {
    await trackTime();
  }
});

// Add this function to clean up existing data
async function cleanupStorageData() {
  const { dailyData = {}, historicalData = {} } = await chrome.storage.local.get(['dailyData', 'historicalData']);
  const today = formatDate(new Date());
  
  // Remove today from historical
  delete historicalData[today];
  
  // Keep only today in dailyData and standardize date format
  const newDailyData = {};
  const newHistoricalData = { ...historicalData };
  
  Object.entries(dailyData).forEach(([date, data]) => {
    // Convert any date format to our standard format
    const standardDate = formatDate(new Date(date.split('/').reverse().join('-')));
    if (standardDate === today) {
      newDailyData[standardDate] = data;
    } else {
      newHistoricalData[standardDate] = data;
    }
  });
  
  await chrome.storage.local.set({
    dailyData: newDailyData,
    historicalData: newHistoricalData,
    currentDate: today
  });
}

// Run cleanup on install
chrome.runtime.onInstalled.addListener(async () => {
  await cleanupStorageData();
  await initializeTracking();
});
