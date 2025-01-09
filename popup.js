function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function sortWebsites(data) {
  return Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value
    }), {});
}

function getLastThirtyDays() {
  const dates = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString());
  }
  return dates.reverse();
}

let currentDisplayDate = new Date();

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthDates(year, month) {
  const dates = [];
  const daysInMonth = getDaysInMonth(year, month);
  
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push({
      date: new Date(year, month, day).toLocaleDateString(),
      dayNumber: day
    });
  }
  
  return dates;
}

function updateCalendarHeader() {
  const monthName = currentDisplayDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('currentMonth').textContent = monthName;
}

function createCalendarGrid(historicalData) {
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = '';
  
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startPadding = firstDay.getDay();
  const dates = getMonthDates(year, month);
  
  // Add padding cells for the start of the month
  for (let i = 0; i < startPadding; i++) {
    const paddingCell = document.createElement('div');
    paddingCell.className = 'calendar-day';
    calendarGrid.appendChild(paddingCell);
  }
  
  // Add date cells
  dates.forEach(({ date, dayNumber }) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.textContent = dayNumber;
    
    if (historicalData && historicalData[date]) {
      cell.classList.add('has-data');
      const totalTime = Object.values(historicalData[date]).reduce((a, b) => a + b, 0);
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = `${date}: ${formatTime(totalTime)}`;
      cell.appendChild(tooltip);
    }
    
    // Highlight current day
    if (date === new Date().toLocaleDateString()) {
      cell.classList.add('current-day');
    }
    
    calendarGrid.appendChild(cell);
  });
}

function calculateCategoryTotals(data) {
  const categoryTotals = {};
  
  for (const [site, time] of Object.entries(data)) {
    const category = getCategoryForDomain(site);
    categoryTotals[category] = (categoryTotals[category] || 0) + time;
  }
  
  return categoryTotals;
}

function createCategorySummary(categoryTotals, totalTime) {
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'category-summary';
  
  // Create category bar
  const barDiv = document.createElement('div');
  barDiv.className = 'category-bar';
  
  // Create legend
  const legendDiv = document.createElement('div');
  legendDiv.className = 'category-legend';
  
  for (const [category, time] of Object.entries(categoryTotals)) {
    const percentage = (time / totalTime) * 100;
    
    // Add bar segment
    const segment = document.createElement('div');
    segment.className = 'category-segment';
    segment.style.width = `${percentage}%`;
    segment.style.backgroundColor = CATEGORIES[category].color;
    barDiv.appendChild(segment);
    
    // Add legend item
    const legendItem = document.createElement('div');
    legendItem.className = 'category-item';
    legendItem.innerHTML = `
      <div class="category-dot" style="background-color: ${CATEGORIES[category].color}"></div>
      ${CATEGORIES[category].name}: ${formatTime(time)} (${Math.round(percentage)}%)
    `;
    legendDiv.appendChild(legendItem);
  }
  
  summaryDiv.appendChild(barDiv);
  summaryDiv.appendChild(legendDiv);
  return summaryDiv;
}

function addDebugControls() {
  const debugDiv = document.createElement('div');
  debugDiv.style.marginTop = '20px';
  debugDiv.style.padding = '10px';
  debugDiv.style.borderTop = '1px solid var(--divider)';
  
  // Add view storage button
  const viewButton = document.createElement('button');
  viewButton.textContent = 'View Storage Data';
  viewButton.className = 'reset-button reset-today';
  viewButton.onclick = async () => {
    const data = await chrome.storage.local.get(null);
    console.log('Current storage data:', data);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(data, null, 2);
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontSize = '12px';
    debugDiv.appendChild(pre);
  };
  
  debugDiv.appendChild(viewButton);
  document.body.appendChild(debugDiv);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Add this line near the start
  addDebugControls();

  // Debug: Log all storage data
  chrome.storage.local.get(null, function(items) {
    console.log('All storage data:', items);
  });

  const dataDiv = document.getElementById("data");
  const dateInfo = document.getElementById("dateInfo");
  const viewToggle = document.getElementById("viewToggle");
  const dailyView = document.getElementById("daily-view");
  const calendarView = document.getElementById("calendar-view");
  
  // Set initial display states
  dailyView.style.display = 'block';
  calendarView.style.display = 'none';
  
  // Set current date
  const today = new Date().toLocaleDateString();
  dateInfo.textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const { dailyData = {}, historicalData = {} } = await chrome.storage.local.get(['dailyData', 'historicalData']);
  console.log('Daily data for today:', dailyData[today]); // Debug log

  // Create calendar grid
  createCalendarGrid(historicalData);

  // Toggle view button
  viewToggle.addEventListener('click', () => {
    if (calendarView.style.display === 'none') {
      dailyView.style.display = 'none';
      calendarView.style.display = 'block';
      viewToggle.textContent = 'View Today';
    } else {
      dailyView.style.display = 'block';
      calendarView.style.display = 'none';
      viewToggle.textContent = 'View Calendar';
    }
  });

  // Add month navigation handlers
  document.getElementById('prevMonth').addEventListener('click', async () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
    updateCalendarHeader();
    const { historicalData = {} } = await chrome.storage.local.get('historicalData');
    createCalendarGrid(historicalData);
  });

  document.getElementById('nextMonth').addEventListener('click', async () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
    updateCalendarHeader();
    const { historicalData = {} } = await chrome.storage.local.get('historicalData');
    createCalendarGrid(historicalData);
  });

  // Initialize calendar header
  updateCalendarHeader();

  // Rest of your existing code for displaying daily data
  if (dailyData[today] && Object.keys(dailyData[today]).length > 0) {
    const todayData = dailyData[today];
    const sortedData = sortWebsites(todayData);
    const totalTime = Object.values(todayData).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    
    console.log('Sorted data:', sortedData); // Debug log
    console.log('Total time:', totalTime); // Debug log
    
    // Add total time
    const totalDiv = document.createElement("div");
    totalDiv.className = "total-time";
    totalDiv.textContent = `${formatTime(totalTime)} Today`;
    dataDiv.appendChild(totalDiv);
    
    // Add category summary
    const categoryTotals = calculateCategoryTotals(todayData);
    const categorySummary = createCategorySummary(categoryTotals, totalTime);
    dataDiv.appendChild(categorySummary);
    
    // Create websites container
    const websitesContainer = document.createElement("div");
    websitesContainer.className = "websites-container";
    
    // Add websites header
    const websitesHeader = document.createElement("div");
    websitesHeader.className = "websites-header";
    websitesHeader.textContent = "Websites";
    websitesContainer.appendChild(websitesHeader);

    // Add individual sites with categories
    for (const [site, time] of Object.entries(sortedData)) {
      if (isNaN(time)) {
        console.log('Skipping NaN time for site:', site);
        continue;
      }

      const div = document.createElement("div");
      div.className = "website";
      
      const siteInfo = document.createElement("div");
      siteInfo.className = "website-info";
      
      // Create favicon element
      const favicon = document.createElement("img");
      favicon.className = "website-favicon";
      favicon.src = `https://www.google.com/s2/favicons?domain=${site}&sz=32`;
      favicon.alt = "";
      siteInfo.appendChild(favicon);
      
      const textInfo = document.createElement("div");
      textInfo.className = "website-text";
      
      const domain = document.createElement("div");
      domain.className = "website-domain";
      domain.textContent = site.replace('www.', '');
      
      const timeSpan = document.createElement("div");
      timeSpan.className = "website-time";
      timeSpan.textContent = formatTime(time);
      
      textInfo.appendChild(domain);
      textInfo.appendChild(timeSpan);
      siteInfo.appendChild(textInfo);
      
      const category = getCategoryForDomain(site);
      const categorySpan = document.createElement("span");
      categorySpan.className = "website-category";
      categorySpan.textContent = CATEGORIES[category].name;
      
      div.appendChild(siteInfo);
      div.appendChild(categorySpan);
      websitesContainer.appendChild(div);
    }
    
    dataDiv.appendChild(websitesContainer);
  } else {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 6V12L16 14" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="empty-text">No data yet for today</div>
    `;
    dataDiv.appendChild(emptyState);
  }

  // Add this to your DOMContentLoaded event listener
  document.getElementById('resetData').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all tracking data? This cannot be undone.')) {
      await chrome.storage.local.clear();
      window.location.reload();
    }
  });

  // Add this to your DOMContentLoaded event listener
  document.getElementById('resetTodayData').addEventListener('click', async () => {
    if (confirm("Are you sure you want to reset today's tracking data? This cannot be undone.")) {
      const today = new Date().toLocaleDateString();
      
      // Get current data
      const data = await chrome.storage.local.get(null);
      console.log('Before reset:', data);
      
      // Reset daily data
      await chrome.storage.local.set({ 
        dailyData: {},
        currentDate: today
      });
      
      console.log('After reset:', await chrome.storage.local.get(null));
      window.location.reload();
    }
  });
});
    