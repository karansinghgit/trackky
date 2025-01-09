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

function getCategoryForDomain(domain) {
  for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
    if (category.domains.some(d => domain.includes(d))) {
      return categoryKey;
    }
  }
  return 'OTHER';
} 