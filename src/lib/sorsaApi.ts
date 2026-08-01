import { requireSupabase } from './supabase';
import { backendFetch } from './appSession';

async function proxySorsa(path: string, options: RequestInit = {}, accessToken?: string) {
  requireSupabase();
  const response = await backendFetch(path, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to verify');
  }

  return body;
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
  },

  /**
   * Forces the backend to refresh the signed-in creator's stored Sorsa profile.
   * Accepts the just-issued Supabase access token as a fallback credential, since
   * the app-session cookie can be briefly unavailable right after login.
   */
  async syncCreatorProfile(accessToken?: string) {
    return proxySorsa('/creator/sorsa/sync', {
      method: 'POST'
    }, accessToken);
  }
};

export default sorsaApi;
