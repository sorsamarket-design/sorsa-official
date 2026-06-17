import { requireSupabase } from './supabase';
import { getBackendBase } from './appSession';

export type TelegramPreferences = {
  newCampaigns: boolean;
  campaignUpdates: boolean;
  payments: boolean;
};

export type TelegramStatus = {
  connected?: boolean;
  telegramUsername?: string | null;
  connectedAt?: string | null;
  preferences?: TelegramPreferences;
};

async function request(path: string, options: RequestInit = {}) {
  requireSupabase();
  const response = await fetch(`${getBackendBase()}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Telegram notifications request failed.');
  }
  return body;
}

async function createStatusEventSource() {
  requireSupabase();
  return new EventSource(`${getBackendBase()}/telegram/status/stream`, { withCredentials: true });
}

const telegramNotifications = {
  getPreferences() {
    return request('/telegram/preferences');
  },

  createStatusEventSource,

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
