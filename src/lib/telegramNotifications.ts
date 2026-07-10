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

export type BrandTelegramGroup = {
  chat_id: string;
  chat_type?: string | null;
  title?: string | null;
  public_link?: string | null;
  bot_status?: string | null;
  bot_permission_status?: string | null;
  last_error?: string | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
};

async function request(path: string, options: RequestInit = {}, accessToken?: string) {
  requireSupabase();
  const response = await fetch(`${getBackendBase()}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
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
  // accessToken is a fallback credential for when the app-session cookie isn't on the
  // request yet (see authenticate() on the backend) - EventSource can't carry it, so
  // the live status stream still depends on the cookie, but this one-shot fetch doesn't.
  getPreferences(accessToken?: string) {
    return request('/telegram/preferences', {}, accessToken);
  },

  createStatusEventSource,

  createConnectLink(accessToken?: string) {
    return request('/telegram/connect-code', { method: 'POST' }, accessToken);
  },

  disconnect(accessToken?: string) {
    return request('/telegram/disconnect', { method: 'POST' }, accessToken);
  },

  updatePreferences(preferences: TelegramPreferences, accessToken?: string) {
    return request('/telegram/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    }, accessToken);
  },

  getBrandGroup(brandProfileId: string, accessToken?: string): Promise<{ group: BrandTelegramGroup | null; botUsername?: string | null }> {
    return request(`/brand/telegram-group/${encodeURIComponent(brandProfileId)}`, {}, accessToken);
  },

  verifyBrandGroup(brandProfileId: string, groupLink: string, accessToken?: string): Promise<{ group: BrandTelegramGroup; botUsername?: string | null }> {
    return request('/brand/telegram-group/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_profile_id: brandProfileId, group_link: groupLink })
    }, accessToken);
  }
};

export default telegramNotifications;
