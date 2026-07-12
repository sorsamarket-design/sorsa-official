import { requireSupabase } from './supabase';

const CAMPAIGN_CODE_LENGTH = 16;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE_PATTERN = /^[0-9a-f]{16}$/i;

type CampaignLinkInput = {
  id: string;
  title?: string | null;
  allocation_type?: 'wl' | 'gtd' | 'fcfs' | string | null;
};

export function getCampaignShortCode(id: string) {
  return String(id || '').replace(/-/g, '').slice(0, CAMPAIGN_CODE_LENGTH).toLowerCase();
}

export function stripNftAllocationLabel(title: string) {
  return String(title || '')
    .trim()
    .replace(/^\((?:WL|GTD|FCFS)\)\s*/i, '')
    .replace(/\s*\((?:WL|GTD|FCFS)\)$/i, '')
    .trim();
}

function getAllocationSuffix(campaign: CampaignLinkInput) {
  const allocation = String(campaign.allocation_type || '').toLowerCase();
  if (allocation === 'gtd' || allocation === 'fcfs') return allocation.toUpperCase();
  const titleMatch = String(campaign.title || '').match(/\((WL|GTD|FCFS)\)\s*$/i);
  return (titleMatch?.[1] || 'WL').toUpperCase();
}

export function getCampaignSlug(campaign: CampaignLinkInput) {
  const baseTitle = stripNftAllocationLabel(campaign.title || '');
  const titleSlug = baseTitle
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!titleSlug) return getCampaignShortCode(campaign.id);
  return `${titleSlug}-${getAllocationSuffix(campaign)}`;
}

export function getCampaignShortPath(input: string | CampaignLinkInput) {
  if (typeof input === 'object' && input) {
    const slug = getCampaignSlug(input);
    return slug ? `/creator/nft-campaigns/${slug}` : '/creator/nft-campaigns';
  }

  const code = getCampaignShortCode(input);
  return code ? `/creator/nft-campaigns/${code}` : '/creator/nft-campaigns';
}

export function isCampaignUuid(value: string) {
  return UUID_PATTERN.test(String(value || '').trim());
}

export function isCampaignShortCode(value: string) {
  return SHORT_CODE_PATTERN.test(String(value || '').trim());
}

function normalizeCampaignSlug(value: string) {
  return String(value || '').trim().toLowerCase();
}

export async function resolveCampaignIdFromCode(value: string) {
  const input = String(value || '').trim();
  if (isCampaignUuid(input)) return input;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, language')
    .in('campaign_type', ['raffle', 'content', 'fcfs', 'all']);

  if (error) throw error;

  const inputKey = normalizeCampaignSlug(input);
  const matches = (data || []).filter((campaign: { id: string; title?: string | null; language?: string | null }) => {
    if (isCampaignShortCode(input) && getCampaignShortCode(campaign.id) === inputKey) return true;
    try {
      const metadata = campaign.language ? JSON.parse(campaign.language) : {};
      return normalizeCampaignSlug(getCampaignSlug({
        id: campaign.id,
        title: campaign.title,
        allocation_type: metadata.allocation_type
      })) === inputKey;
    } catch {
      return normalizeCampaignSlug(getCampaignSlug({ id: campaign.id, title: campaign.title })) === inputKey;
    }
  });

  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) throw new Error('This campaign link is ambiguous.');
  throw new Error('Campaign not found.');
}
