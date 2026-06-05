import { requireSupabase } from './supabase';

const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;

export type TelegramPreferences = {
  newCampaigns: boolean;
  campaignUpdates: boolean;
  payments: boolean;
};

function getBackendBase() {
  if (!launchEndpoint) {
    throw new Error('Telegram notifications are not configured.');
  }

  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '');
}

async function authHeaders() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error('Please sign in again.');
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

async function request(path: string, options: RequestInit = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${getBackendBase()}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...headers
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Telegram notifications request failed.');
  }
  return body;
}

const telegramNotifications = {
  getPreferences() {
    return request('/telegram/preferences');
  },

  createConnectLink() {
    return request('/telegram/connect-code', { method: 'POST' });
  },

  disconnect() {
    return request('/telegram/disconnect', { method: 'POST' });
  },

  updatePreferences(preferences: TelegramPreferences) {
    return request('/telegram/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    });
  }
};

export default telegramNotifications;
