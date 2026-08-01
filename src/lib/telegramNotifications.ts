import { requireSupabase } from './supabase';
import { backendFetch } from './appSession';

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
  brand_profile_id?: string | null;
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
  const response = await backendFetch(path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Telegram notifications request failed.');
  }
  return body;
}

const telegramNotifications = {
  getPreferences(accessToken?: string) {
    return request('/telegram/preferences', {}, accessToken);
  },

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
  },

  listAdminGroups(accessToken?: string): Promise<{ groups: BrandTelegramGroup[]; botUsername?: string | null }> {
    return request('/admin/telegram-groups', {}, accessToken);
  },

  verifyAdminGroup(groupLink: string, accessToken?: string): Promise<{ group: BrandTelegramGroup; botUsername?: string | null }> {
    return request('/admin/telegram-groups/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_link: groupLink })
    }, accessToken);
  }
};

export default telegramNotifications;
