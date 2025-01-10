const CATEGORIES = {
  WORK: {
    name: 'Work',
    color: '#4CAF50', // Green
    domains: [
      'github.com',
      'gitlab.com',
      'stackoverflow.com',
      'jira.com',
      'docs.google.com',
      'slack.com',
      'notion.so'
    ]
  },
  ENTERTAINMENT: {
    name: 'Entertainment',
    color: '#FF5722', // Deep Orange
    domains: [
      'youtube.com',
      'netflix.com',
      'twitch.tv',
      'spotify.com',
      'reddit.com',
      'instagram.com',
      'facebook.com',
      'twitter.com'
    ]
  },
  LEARNING: {
    name: 'Learning',
    color: '#2196F3', // Blue
    domains: [
      'coursera.org',
      'udemy.com',
      'edx.org',
      'medium.com',
      'wikipedia.org',
      'khan-academy.org',
      'freecodecamp.org'
    ]
  },
  PRODUCTIVITY: {
    name: 'Productivity',
    color: '#9C27B0', // Purple
    domains: [
      'trello.com',
      'asana.com',
      'calendar.google.com',
      'drive.google.com',
      'dropbox.com',
      'evernote.com'
    ]
  },
  OTHER: {
    name: 'Other',
    color: '#757575', // Grey
    domains: []
  }
};

// Sync version for initial categorization
function getCategoryForDomain(domain) {
  // Fall back to default categories
  for (const [category, { domains }] of Object.entries(CATEGORIES)) {
    if (domains && domains.some(d => domain.includes(d))) {
      return category;
    }
  }
  return 'OTHER';
}

// Async version for custom rules
async function getCustomCategoryForDomain(domain) {
  const { domainCategories = {} } = await chrome.storage.local.get('domainCategories');
  
  // Check custom rules first
  if (domainCategories[domain]) {
    return domainCategories[domain];
  }
  
  // Fall back to default categorization
  return getCategoryForDomain(domain);
}

// Prefill the domain categories with default ones
async function initializeDomainCategories() {
  const { domainCategories = {} } = await chrome.storage.local.get('domainCategories');
  
  // Only initialize if empty
  if (Object.keys(domainCategories).length === 0) {
    const defaultRules = {};
    
    // Add all default domains from CATEGORIES
    Object.entries(CATEGORIES).forEach(([category, { domains = [] }]) => {
      domains.forEach(domain => {
        defaultRules[domain] = category;
      });
    });
    
    await chrome.storage.local.set({ domainCategories: defaultRules });
  }
} 