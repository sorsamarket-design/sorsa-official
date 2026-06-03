import { requireSupabase } from './supabase';

const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;

function getBackendBase() {
  if (!launchEndpoint) {
    throw new Error('Unable to verify');
  }

  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '');
}

async function getAuthHeaders() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error('Unable to verify');
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

async function proxySorsa(path: string, options: RequestInit = {}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBackendBase()}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders
    }
  });

  if (!response.ok) {
    throw new Error('Unable to verify');
  }

  return response.json();
}

/**
 * Utility to fetch Sorsa data through the trusted backend.
 */
const sorsaApi = {
  /**
   * Fetches full profile info including followers_count
   */
  async fetchInfo(username: string) {
    const handle = username.replace('@', '');
    return proxySorsa(`/sorsa/info?username=${encodeURIComponent(handle)}`);
  },

  /**
   * Fetches the country/region from the About section
   */
  async fetchAbout(username: string) {
    const handle = username.replace('@', '');
    return proxySorsa(`/sorsa/about?username=${encodeURIComponent(handle)}`);
  },

  /**
   * Fetches the numeric Sorsa Score
   */
  async fetchScore(username: string) {
    const handle = username.replace('@', '');
    const data = await proxySorsa(`/sorsa/score?username=${encodeURIComponent(handle)}`);
    return Math.round(data.score || 0);
  },

  /**
   * Fetches tweet data including view_count (impressions)
   */
  async fetchTweetInfo(tweetLinkOrId: string) {
    return proxySorsa('/sorsa/tweet-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tweet_link: tweetLinkOrId
      })
    });
  },

  /**
   * Checks if user_2 (follower) follows user_1 (target)
   */
  async checkFollow(followerHandle: string, targetHandle: string) {
    const data = await proxySorsa('/sorsa/check-follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username_1: targetHandle.replace('@', ''), // The one being followed (Brand)
        username_2: followerHandle.replace('@', '') // The one following (Creator)
      })
    });
    return data.follow === true;
  }
};

export default sorsaApi;
