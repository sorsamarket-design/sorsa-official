import { requireSupabase } from './supabase';
import { backendFetch } from './appSession';
import { getCampaignEndTime } from './campaignTime';
import { resolveCampaignIdFromCode } from './campaignShortLinks';

async function requestNftCampaigns(path: string, options: RequestInit = {}) {
  requireSupabase();
  const response = await backendFetch(path, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || 'NFT campaign request failed');
  }

  return body;
}

function parseCampaignMetadata(campaign: any) {
  try {
    return campaign?.language ? JSON.parse(campaign.language) : {};
  } catch {
    return {};
  }
}

function withNftCampaignMetadata(campaign: any) {
  const metadata = parseCampaignMetadata(campaign);
  return {
    ...campaign,
    image_url: metadata.image_url || null,
    background_image_url: metadata.background_image_url || null,
    allocation_type: ['gtd', 'fcfs'].includes(metadata.allocation_type) ? metadata.allocation_type : 'wl',
    total_gtd: metadata.total_gtd ?? null,
    total_fcfs: metadata.total_fcfs ?? null,
    max_creators: metadata.max_creators ?? null,
    max_content_submissions: metadata.max_content_submissions ?? null,
    follow_accounts: Array.isArray(metadata.follow_accounts) ? metadata.follow_accounts : [],
    retweet_links: Array.isArray(metadata.retweet_links) ? metadata.retweet_links : [],
    comment_links: Array.isArray(metadata.comment_links) ? metadata.comment_links : [],
    engagement_links: Array.isArray(metadata.engagement_links) ? metadata.engagement_links : [],
    telegram_tasks: Array.isArray(metadata.telegram_tasks) ? metadata.telegram_tasks : [],
    collection_details: metadata.collection_details && typeof metadata.collection_details === 'object' ? metadata.collection_details : {},
    raffle_results: Array.isArray(metadata.raffle_results) ? metadata.raffle_results : [],
    raffle_finalized_at: metadata.raffle_finalized_at || null
  };
}

function emptyStats() {
  return {
    joined_count: 0,
    approved_count: 0,
    rejected_count: 0
  };
}

function nftTaskKey(taskType: string, taskValue: string) {
  return `${String(taskType || '').trim().toLowerCase()}:${String(taskValue || '').trim()}`;
}

async function getNftTaskVerificationMap(campaignId: string, creatorId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('nft_task_verifications')
    .select('task_type, task_value')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId);
  if (error) {
    console.warn('NFT task verifications unavailable:', error.message || error);
    return {};
  }
  const verified: Record<string, boolean> = {};
  for (const row of data || []) {
    verified[nftTaskKey(row.task_type, row.task_value)] = true;
  }
  return verified;
}

async function getCurrentUserId() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

async function getNftCampaignStatsMap(campaignIds: string[]) {
  const supabase = requireSupabase();
  const ids = Array.from(new Set((campaignIds || []).filter(Boolean)));
  const statsMap = new Map<string, ReturnType<typeof emptyStats>>();
  ids.forEach((id) => statsMap.set(id, emptyStats()));
  if (!ids.length) return statsMap;

  const { data: rpcStats, error: rpcError } = await supabase.rpc('get_nft_campaign_stats', {
    campaign_ids: ids
  });
  if (!rpcError) {
    for (const stat of rpcStats || []) {
      statsMap.set(stat.campaign_id, {
        joined_count: Number(stat.joined_count || 0),
        approved_count: Number(stat.approved_count || 0),
        rejected_count: Number(stat.rejected_count || 0)
      });
    }
    return statsMap;
  }

  console.warn('NFT stats RPC unavailable, falling back to direct participant read:', rpcError.message);
  const { data, error } = await supabase
    .from('campaign_participants')
    .select('campaign_id, status')
    .in('campaign_id', ids);
  if (error) throw error;

  for (const participant of data || []) {
    const stats = statsMap.get(participant.campaign_id) || emptyStats();
    stats.joined_count += 1;
    if (participant.status === 'approved') stats.approved_count += 1;
    if (participant.status === 'rejected') stats.rejected_count += 1;
    statsMap.set(participant.campaign_id, stats);
  }

  return statsMap;
}

async function withBackendReadFallback<T>(read: () => Promise<T>, fallbackPath: string): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.warn(`Direct Supabase NFT read failed for ${fallbackPath}, falling back to backend:`, error);
    return requestNftCampaigns(fallbackPath);
  }
}

const nftCampaignSelect = 'id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at';

export type NftCampaignType = 'raffle' | 'content';

export type NftCampaignPayload = {
  title: string;
  goal: string;
  campaign_type: NftCampaignType;
  overview: string;
  categories: string[];
  budget: number;
  allocation_type?: 'wl' | 'gtd' | 'fcfs';
  total_gtd?: number | null;
  total_fcfs?: number | null;
  min_sorsa_score: number | null;
  image_url: string | null;
  background_image_url: string | null;
  max_creators: number | null;
  max_content_submissions?: number | null;
  follow_accounts: string[];
  retweet_links: string[];
  comment_links: string[];
  engagement_links: string[];
  telegram_tasks?: TelegramTask[];
  collection_details?: CollectionDetails;
  start_date: string | null;
  end_date: string | null;
};

export type CollectionDetails = {
  chain?: string | null;
  mint_date?: string | null;
  supply?: string | null;
  mint_price?: string | null;
};

export function getNftCampaignPrimaryAllocation(campaign: Pick<NftCampaignPayload, 'allocation_type' | 'budget' | 'total_gtd' | 'total_fcfs'>) {
  const allocationType = campaign.allocation_type === 'gtd' || campaign.allocation_type === 'fcfs'
    ? campaign.allocation_type
    : 'wl';
  const useGtd = allocationType === 'gtd';
  const useFcfs = allocationType === 'fcfs';
  return {
    label: useFcfs ? 'Total FCFS' : useGtd ? 'Total GTD' : 'Total WL',
    suffix: useFcfs ? 'FCFS' : useGtd ? 'GTD' : 'WL',
    value: Number(useFcfs ? campaign.total_fcfs || 0 : useGtd ? campaign.total_gtd || 0 : campaign.budget || 0)
  };
}

export type TelegramTask = {
  chat_id: string;
  title?: string | null;
  public_link?: string | null;
};

export type TelegramGroupStatus = TelegramTask & {
  chat_type?: string | null;
  public_link?: string | null;
  bot_status?: string | null;
  bot_permission_status?: string | null;
  last_error?: string | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
};

export type NftCampaign = NftCampaignPayload & {
  id: string;
  status: string;
  created_at: string;
  raffle_results?: RaffleWinner[];
  raffle_finalized_at?: string | null;
  stats?: {
    joined_count: number;
    approved_count: number;
    rejected_count: number;
  };
};

export type AdminRaffleListResult = {
  campaigns: NftCampaign[];
};

export type AdminRaffleDetailResult = {
  campaign: NftCampaign;
  participants: any[];
  stats: {
    joined_count: number;
    approved_count: number;
    rejected_count: number;
  };
};

export type RaffleWinner = {
  participant_id: string;
  creator_id: string;
  name: string;
  x_account: string;
  wallet_address: string;
};

export async function createNftCampaign(campaign: NftCampaignPayload) {
  return requestNftCampaigns('/admin/nft-campaigns', {
    method: 'POST',
    body: JSON.stringify({ campaign })
  });
}

export async function getAdminTelegramGroupStatuses(chatIds: string[]) {
  return requestNftCampaigns('/admin/telegram-groups/status', {
    method: 'POST',
    body: JSON.stringify({ chat_ids: chatIds })
  });
}

export async function listNftCampaigns() {
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('campaigns')
      .select(nftCampaignSelect)
      .in('status', ['draft', 'completed'])
      .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    const statsMap = await getNftCampaignStatsMap((data || []).map((campaign: any) => campaign.id));
    return {
      campaigns: (data || []).map((campaign: any) => ({
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || emptyStats()
      }))
    };
  }, '/nft-campaigns');
}

export async function listCreatorNftParticipations() {
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`
        id,
        campaign_id,
        creator_id,
        status,
        joined_at,
        approved_at,
        campaign:campaigns (
          id,
          title,
          goal,
          campaign_type,
          categories,
          overview,
          budget,
          min_sorsa_score,
          language,
          status,
          start_date,
          end_date,
          created_at
        )
      `)
      .eq('creator_id', userId)
      .neq('status', 'rejected')
      .order('joined_at', { ascending: false });
    if (error) throw error;

    const now = Date.now();
    const campaignIds = (data || []).map((item: any) => item.campaign?.id).filter(Boolean);
    const statsMap = await getNftCampaignStatsMap(campaignIds);
    const nftParticipations = (data || [])
      .filter((item: any) => item.campaign && ['raffle', 'content', 'fcfs', 'all'].includes(item.campaign.campaign_type))
      .map((item: any) => ({
        ...item,
        campaign: {
          ...withNftCampaignMetadata(item.campaign),
          stats: statsMap.get(item.campaign.id) || emptyStats()
        }
      }));

    const isPastNftCampaign = (campaign: any) => {
      if (campaign.status === 'completed') return true;
      const endTime = getCampaignEndTime(campaign.end_date);
      return Boolean(endTime && endTime <= now);
    };

    return {
      active: nftParticipations.filter((item: any) => !isPastNftCampaign(item.campaign)),
      past: nftParticipations.filter((item: any) => isPastNftCampaign(item.campaign))
    };
  }, '/nft-campaigns/mine');
}

export async function listAdminRaffles(): Promise<AdminRaffleListResult> {
  return requestNftCampaigns('/admin/raffles');
}

export async function listAdminNftContentCampaigns() {
  return requestNftCampaigns('/admin/nft-content-campaigns');
}

export async function getAdminNftContentCampaign(id: string) {
  const path = `/admin/nft-content-campaigns/${encodeURIComponent(id)}`;
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const [
      { data: campaign, error: campaignError },
      { data: participants, error: participantError },
      { data: submissions, error: submissionError }
    ] = await Promise.all([
      supabase
        .from('campaigns')
        .select(nftCampaignSelect)
        .eq('id', id)
        .in('campaign_type', ['content', 'all'])
        .single(),
      supabase
        .from('campaign_participants')
        .select(`
          id,
          creator_id,
          status,
          joined_at,
          creator_profile:creator_profiles!creator_id (
            full_name,
            x_handle,
            wallet_address,
            avatar_url,
            sorsa_score
          )
        `)
        .eq('campaign_id', id)
        .order('joined_at', { ascending: false }),
      supabase
        .from('campaign_submissions')
        .select('id, participation_id, campaign_id, creator_id, tweet_url, status, submitted_at')
        .eq('campaign_id', id)
        .order('submitted_at', { ascending: false })
    ]);
    if (campaignError || !campaign) throw campaignError || new Error('NFT content campaign not found');
    if (participantError) throw participantError;
    if (submissionError) throw submissionError;

    return {
      campaign: withNftCampaignMetadata(campaign),
      participants: participants || [],
      submissions: submissions || []
    };
  }, path);
}

export async function listAdminNftContentSubmissions() {
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('campaign_submissions')
      .select(`
        id,
        participation_id,
        campaign_id,
        creator_id,
        tweet_url,
        status,
        submitted_at,
        campaign:campaigns!inner (
          id,
          title,
          campaign_type,
          budget
        ),
        creator_profile:creator_profiles!creator_id (
          x_handle,
          full_name,
          avatar_url
        )
      `)
      .in('campaign.campaign_type', ['content', 'all'])
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return { submissions: data || [] };
  }, '/admin/nft-content-submissions');
}

export async function updateAdminNftSubmissionStatus(id: string, status: 'approved' | 'rejected', feedback = '') {
  return requestNftCampaigns(`/submissions/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, feedback })
  });
}

export async function getAdminRaffle(id: string): Promise<AdminRaffleDetailResult> {
  const path = `/admin/raffles/${encodeURIComponent(id)}`;
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const [{ data: campaign, error }, { data: participants, error: participantError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select(nftCampaignSelect)
        .eq('id', id)
        .in('campaign_type', ['raffle', 'fcfs'])
        .single(),
      supabase
        .from('campaign_participants')
        .select(`
          id,
          creator_id,
          status,
          joined_at,
          approved_at,
          base_reward,
          creator_profile:creator_profiles!creator_id (
            id,
            x_handle,
            full_name,
            avatar_url,
            sorsa_score,
            follower_count,
            wallet_address
          )
        `)
        .eq('campaign_id', id)
        .order('joined_at', { ascending: false })
    ]);
    if (error || !campaign) throw error || new Error('Raffle campaign not found');
    if (participantError) throw participantError;

    const rows = participants || [];
    const stats = {
      joined_count: rows.length,
      approved_count: rows.filter((participant: any) => participant.status === 'approved').length,
      rejected_count: rows.filter((participant: any) => participant.status === 'rejected').length
    };

    return {
      campaign: withNftCampaignMetadata(campaign),
      participants: rows,
      stats
    };
  }, path);
}

export async function finalizeAdminRaffle(id: string) {
  return requestNftCampaigns(`/admin/raffles/${encodeURIComponent(id)}/finalize`, {
    method: 'POST'
  });
}

export async function getNftCampaign(id: string) {
  const resolvedId = await resolveCampaignIdFromCode(id);
  const path = `/nft-campaigns/${encodeURIComponent(resolvedId)}`;
  return withBackendReadFallback(async () => {
    const supabase = requireSupabase();
    const userId = await getCurrentUserId();
    const [{ data: campaign, error }, { data: participation, error: participationError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select(nftCampaignSelect)
        .eq('id', resolvedId)
        .in('status', ['draft', 'completed'])
        .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
        .single(),
      supabase
        .from('campaign_participants')
        .select('id, status, joined_at')
        .eq('campaign_id', resolvedId)
        .eq('creator_id', userId)
        .maybeSingle()
    ]);
    if (error || !campaign) throw error || new Error('NFT campaign not found');
    if (participationError) throw participationError;

    const [statsMap, verifiedTasks] = await Promise.all([
      getNftCampaignStatsMap([campaign.id]),
      getNftTaskVerificationMap(campaign.id, userId)
    ]);
    return {
      campaign: {
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || emptyStats()
      },
      participation: participation || null,
      verified_tasks: verifiedTasks
    };
  }, path);
}

export async function joinNftCampaign(id: string) {
  return requestNftCampaigns(`/nft-campaigns/${encodeURIComponent(id)}/join`, {
    method: 'POST'
  });
}

export async function submitNftCampaignContent(id: string, tweetUrl: string) {
  return requestNftCampaigns(`/nft-campaigns/${encodeURIComponent(id)}/submissions`, {
    method: 'POST',
    body: JSON.stringify({ tweet_url: tweetUrl })
  });
}

export async function verifyNftCampaignTask(id: string, task: { type: 'follow' | 'retweet' | 'comment' | 'engagement' | 'telegram'; value: string }) {
  return requestNftCampaigns(`/nft-campaigns/${encodeURIComponent(id)}/verify-task`, {
    method: 'POST',
    body: JSON.stringify(task)
  });
}
