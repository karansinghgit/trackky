const CATEGORIES = {
  WORK: {
    name: 'Work',
    color: '#4CAF50', // Green
    domains: [
      'jira.com',
      'docs.google.com',
      'slack.com',
      'notion.so',
      'chatgpt.com',
      'claude.ai',
      'perplexity.ai',
      'mail.google.com',
      'meet.google.com',
      'startupschool.org',
      'lu.ma'
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
      'x.com',
      'linkedin.com',
    ]
  },
  LEARNING: {
    name: 'Learning',
    color: '#2196F3', // Blue
    domains: [
      'leetcode.com',
      'github.com',
      'github.io',
      'gitlab.com',
      'stackoverflow.com',
      'medium.com',
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
  
  // Get current default rules
  const defaultRules = {};
  Object.entries(CATEGORIES).forEach(([category, { domains = [] }]) => {
    domains.forEach(domain => {
      defaultRules[domain] = category;
    });
  });
  
  // Merge with existing rules, keeping custom rules but updating defaults
  const updatedRules = { ...defaultRules, ...domainCategories };
  
  await chrome.storage.local.set({ domainCategories: updatedRules });
} 