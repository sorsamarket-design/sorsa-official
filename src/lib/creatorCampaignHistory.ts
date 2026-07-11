import { supabase } from './supabase';

export type CreatorCampaignHistoryItem = {
  id: string;
  status: string;
  joined_at: string | null;
  approved_at?: string | null;
  campaign: {
    id: string;
    title: string;
    goal?: string | null;
    campaign_type: string;
    status: string;
    end_date?: string | null;
    categories?: string[] | null;
    language?: string | null;
    brand_name?: string | null;
    brand_logo_url?: string | null;
    brand_profile?: {
      company_name?: string | null;
      logo_url?: string | null;
    } | null;
    image_url?: string | null;
    background_image_url?: string | null;
    is_nft?: boolean;
  };
};

function getCampaignEndTime(endDate?: string | null) {
  if (!endDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
    return new Date(`${endDate}T23:59:59`).getTime();
  }
  const time = new Date(endDate).getTime();
  return Number.isNaN(time) ? null : time;
}

function withCampaignMetadata(item: any): CreatorCampaignHistoryItem | null {
  if (!item?.campaign) return null;

  let metadata: any = {};
  try {
    metadata = item.campaign.language ? JSON.parse(item.campaign.language) : {};
  } catch {
    metadata = {};
  }

  const categories = Array.isArray(item.campaign.categories) ? item.campaign.categories : [];
  const campaignType = String(item.campaign.campaign_type || '').toLowerCase();
  const isNft = Boolean(metadata.nft) || categories.some((category: string) => String(category).toLowerCase() === 'nft');

  return {
    ...item,
    campaign: {
      ...item.campaign,
      image_url: metadata.image_url || item.campaign.brand_logo_url || item.campaign.brand_profile?.logo_url || null,
      background_image_url: metadata.background_image_url || null,
      is_nft: isNft || ['raffle', 'content', 'fcfs', 'all'].includes(campaignType)
    }
  };
}

function isPastCampaign(item: CreatorCampaignHistoryItem) {
  if (item.campaign.status === 'completed') return true;
  const endTime = getCampaignEndTime(item.campaign.end_date);
  return Boolean(endTime && endTime <= Date.now());
}

export async function getCreatorPastCampaignHistory(creatorId: string) {
  const { data, error } = await supabase
    .from('campaign_participants')
    .select(`
      id,
      status,
      joined_at,
      approved_at,
      campaign:campaigns (
        id,
        title,
        goal,
        campaign_type,
        status,
        end_date,
        categories,
        language,
        brand_name,
        brand_logo_url,
        brand_profile:brand_profiles!brand_profile_id (
          company_name,
          logo_url
        )
      )
    `)
    .eq('creator_id', creatorId)
    .neq('status', 'rejected')
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    .map(withCampaignMetadata)
    .filter((item): item is CreatorCampaignHistoryItem => Boolean(item))
    .filter(isPastCampaign);
}
