const API_BASE = import.meta.env.VITE_SORSA_API_BASE || 'https://api.sorsa.io/v3';
const API_KEY = import.meta.env.VITE_SORSA_API_KEY;

/**
 * Utility to fetch data from Sorsa (TweetScout) API v3
 */
const sorsaApi = {
  /**
   * Fetches full profile info including followers_count
   */
  async fetchInfo(username: string) {
    if (!API_KEY) throw new Error('Sorsa API Key is missing in .env');
    
    // Ensure handle doesn't have @
    const handle = username.replace('@', '');
    
    const response = await fetch(`${API_BASE}/info?username=${handle}`, {
      method: 'GET',
      headers: {
        'ApiKey': API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Sorsa info');
    }

    return response.json();
  },

  /**
   * Fetches the country/region from the About section
   */
  async fetchAbout(username: string) {
    if (!API_KEY) throw new Error('Sorsa API Key is missing in .env');
    
    const handle = username.replace('@', '');
    
    const response = await fetch(`${API_BASE}/about?username=${handle}`, {
      method: 'GET',
      headers: {
        'ApiKey': API_KEY
      }
    });

    if (!response.ok) {
      // If the about endpoint fails (e.g. 404), return null instead of throwing so it doesn't break the main flow
      return { country: null };
    }

    return response.json();
  },

  /**
   * Fetches the numeric Sorsa Score
   */
  async fetchScore(username: string) {
    if (!API_KEY) throw new Error('Sorsa API Key is missing in .env');
    
    const handle = username.replace('@', '');
    
    const response = await fetch(`${API_BASE}/score?username=${handle}`, {
      method: 'GET',
      headers: {
        'ApiKey': API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Sorsa score');
    }

    const data = await response.json();
    return Math.round(data.score || 0);
  },

  /**
   * Fetches tweet data including view_count (impressions)
   */
  async fetchTweetInfo(tweetLinkOrId: string) {
    if (!API_KEY) throw new Error('Sorsa API Key is missing in .env');
    
    const response = await fetch(`${API_BASE}/tweet-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        tweet_link: tweetLinkOrId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tweet info');
    }

    return response.json();
  },

  /**
   * Checks if user_2 (follower) follows user_1 (target)
   */
  async checkFollow(followerHandle: string, targetHandle: string) {
    if (!API_KEY) throw new Error('Sorsa API Key is missing in .env');
    
    const response = await fetch(`${API_BASE}/check-follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        username_1: targetHandle.replace('@', ''), // The one being followed (Brand)
        username_2: followerHandle.replace('@', '') // The one following (Creator)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify follow status');
    }

    const data = await response.json();
    return data.follow === true;
  }
};

export default sorsaApi;
