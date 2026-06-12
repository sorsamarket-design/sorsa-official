import { requireSupabase } from './supabase';

const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;

function getBackendBase() {
  if (!launchEndpoint) {
    throw new Error('Backend endpoint is not configured');
  }

  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '');
}

async function getAuthHeaders() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error('Not authenticated');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function requestNftCampaigns(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getBackendBase()}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(await getAuthHeaders())
    }
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || 'NFT campaign request failed');
  }

  return body;
}

export type NftCampaignType = 'raffle' | 'content';

export type NftCampaignPayload = {
  title: string;
  goal: string;
  campaign_type: NftCampaignType;
  overview: string;
  categories: string[];
  budget: number;
  min_sorsa_score: number | null;
  image_url: string | null;
  background_image_url: string | null;
  max_creators: number | null;
  max_content_submissions?: number | null;
  follow_accounts: string[];
  retweet_links: string[];
  start_date: string | null;
  end_date: string | null;
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

export async function listNftCampaigns() {
  return requestNftCampaigns('/nft-campaigns');
}

export async function listCreatorNftParticipations() {
  return requestNftCampaigns('/nft-campaigns/mine');
}

export async function listAdminRaffles() {
  return requestNftCampaigns('/admin/raffles');
}

export async function getAdminRaffle(id: string) {
  return requestNftCampaigns(`/admin/raffles/${encodeURIComponent(id)}`);
}

export async function finalizeAdminRaffle(id: string) {
  return requestNftCampaigns(`/admin/raffles/${encodeURIComponent(id)}/finalize`, {
    method: 'POST'
  });
}

export async function getNftCampaign(id: string) {
  return requestNftCampaigns(`/nft-campaigns/${encodeURIComponent(id)}`);
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

export async function verifyNftCampaignTask(id: string, task: { type: 'follow' | 'retweet'; value: string }) {
  return requestNftCampaigns(`/nft-campaigns/${encodeURIComponent(id)}/verify-task`, {
    method: 'POST',
    body: JSON.stringify(task)
  });
}
