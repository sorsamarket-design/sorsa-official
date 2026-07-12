import { requireSupabase } from './supabase';

const CAMPAIGN_CODE_LENGTH = 16;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE_PATTERN = /^[0-9a-f]{16}$/i;

export function getCampaignShortCode(id: string) {
  return String(id || '').replace(/-/g, '').slice(0, CAMPAIGN_CODE_LENGTH).toLowerCase();
}

export function getCampaignShortPath(id: string) {
  const code = getCampaignShortCode(id);
  return code ? `/campaigns/${code}` : '/campaigns';
}

export function isCampaignUuid(value: string) {
  return UUID_PATTERN.test(String(value || '').trim());
}

export function isCampaignShortCode(value: string) {
  return SHORT_CODE_PATTERN.test(String(value || '').trim());
}

export async function resolveCampaignIdFromCode(value: string) {
  const input = String(value || '').trim();
  if (isCampaignUuid(input)) return input;
  if (!isCampaignShortCode(input)) {
    throw new Error('Invalid campaign link.');
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .in('campaign_type', ['raffle', 'content', 'fcfs', 'all']);

  if (error) throw error;

  const matches = (data || []).filter((campaign: { id: string }) =>
    getCampaignShortCode(campaign.id) === input.toLowerCase()
  );

  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) throw new Error('This campaign link is ambiguous.');
  throw new Error('Campaign not found.');
}
