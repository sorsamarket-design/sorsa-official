import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getBackendBase } from '../lib/appSession';

export interface Campaign {
  id: string;
  brand_profile_id: string;
  owner_id?: string;
  title: string;
  goal: string;
  campaign_type: string;
  min_sorsa_score?: number;
  language?: string;
  categories: string[];
  overview: string;
  budget: number;
  platform_fee: number;
  net_budget?: number | null;
  escrowed_budget?: number | null;
  status: string; // 'draft' | 'live' | 'completed'
  created_at: string;
  start_date?: string;
  end_date?: string;
  release_at?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_twitter_handle?: string | null;
  brand_profile?: {
    company_name: string;
    logo_url: string;
    twitter_handle?: string;
  };
  campaign_stats?: {
    max_base_pool: number;
    allocated_base_pool: number;
  }[];
  escrow_campaign_id?: string | null;
  escrow_contract_address?: string | null;
  escrow_tx_hash?: string | null;
  metadata_hash?: string | null;
  brand_wallet?: string | null;
  additional_requirements?: {
    telegram_enabled?: boolean;
    telegram_tasks?: { chat_id: string; title?: string | null }[];
  } | null;
}

function isEscrowConfirmedCampaign(campaign: Partial<Campaign> | null | undefined) {
  return Boolean(
    campaign?.escrow_campaign_id &&
    campaign?.escrow_contract_address &&
    campaign?.escrow_tx_hash &&
    campaign?.metadata_hash &&
    campaign?.brand_wallet
  );
}

function withBrandSnapshot<T extends Partial<Campaign> | null | undefined>(campaign: T): T {
  if (!campaign) return campaign;

  const profile: Partial<NonNullable<Campaign['brand_profile']>> = campaign.brand_profile || {};
  return {
    ...campaign,
    brand_profile: {
      ...profile,
      company_name: campaign.brand_name || profile.company_name || '',
      logo_url: campaign.brand_logo_url || profile.logo_url || '',
      twitter_handle: campaign.brand_twitter_handle || profile.twitter_handle || ''
    }
  } as T;
}

function getBackendBaseUrl() {
  const url = new URL(getBackendBase());
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function getBackendAuthHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

export function useCampaigns(brandId?: string) {
  const { user } = useAuth();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Fetch campaigns
      let campaignsQuery = supabase
        .from('campaigns')
        .select(`
          *,
          brand_profile:brand_profiles!brand_profile_id (*)
        `)
        .order('created_at', { ascending: false });

      if (brandId) {
        campaignsQuery = campaignsQuery.eq('brand_profile_id', brandId);
      }
      const isBrandWorkspace = location.pathname.startsWith('/brand');
      if (isBrandWorkspace) {
        campaignsQuery = campaignsQuery.eq('owner_id', user.id);
      }

      // 2. Fetch stats from our view
      const [campaignsRes, statsRes] = await Promise.all([
        campaignsQuery,
        supabase.from('campaign_stats').select('*')
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (statsRes.error) {
        console.warn('Could not fetch campaign stats:', statsRes.error);
      }

      const campaignsData = (campaignsRes.data || []).filter((campaign) => {
        if (isBrandWorkspace) {
          return campaign.status === 'draft' || isEscrowConfirmedCampaign(campaign);
        }
        return ['live', 'completed'].includes(campaign.status) && isEscrowConfirmedCampaign(campaign);
      });
      const statsData = statsRes.data || [];

      // 3. Merge stats into campaigns
      const mergedData = campaignsData.map(campaign => ({
        ...withBrandSnapshot(campaign),
        campaign_stats: statsData.filter(s => s.campaign_id === campaign.id)
      }));

      setCampaigns(mergedData);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, brandId, location.pathname]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'brand_profile'>) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{ ...campaignData, owner_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    await fetchCampaigns();
    return data;
  };

  const getCampaign = useCallback(async (id: string) => {
    try {
      const [campaignRes, statsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select(`
            *,
            brand_profile:brand_profiles!brand_profile_id (*)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('campaign_stats')
          .select('*')
          .eq('campaign_id', id)
          .maybeSingle()
      ]);

      if (campaignRes.error) throw campaignRes.error;
      
      const campaign = withBrandSnapshot(campaignRes.data as Campaign) as Campaign;
      const isOwnedBrandDraft = location.pathname.startsWith('/brand') &&
        campaign.status === 'draft' &&
        campaign.owner_id === user?.id;
      if (!isEscrowConfirmedCampaign(campaign) && !isOwnedBrandDraft) return null;
      if (statsRes.data) {
        campaign.campaign_stats = [statsRes.data];
      }

      return campaign;
    } catch (err: any) {
      console.error('Error getting campaign:', err);
      return null;
    }
  }, [location.pathname, user?.id]);

  const joinCampaign = useCallback(async (campaignId: string) => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${getBackendBaseUrl()}/campaigns/${encodeURIComponent(campaignId)}/join`, {
      method: 'POST',
      credentials: 'include',
      headers: await getBackendAuthHeaders()
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || 'Could not join campaign');
    }

    return result?.participation;
  }, [user]);

  const checkParticipation = useCallback(async (campaignId: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('campaign_participants')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('creator_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking participation:', error);
      return null;
    }
    return data;
  }, [user]);

  const getCreatorActiveCampaigns = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`
        *,
        campaign:campaigns (
          *,
          brand_profile:brand_profiles!brand_profile_id (*)
        )
      `)
      .eq('creator_id', user.id)
      .in('status', ['active', 'submitted', 'revision', 'approved']);

    if (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
    return (data || [])
      .map((item: any) => ({ ...item, campaign: withBrandSnapshot(item.campaign) }))
      .filter((item: any) => item.campaign?.status === 'live' && isEscrowConfirmedCampaign(item.campaign));
  }, [user]);

  const getCreatorPastCampaigns = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`
        *,
        campaign:campaigns (
          *,
          brand_profile:brand_profiles!brand_profile_id (*)
        )
      `)
      .eq('creator_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching past campaigns:', error);
      return [];
    }
    return (data || [])
      .map((item: any) => ({ ...item, campaign: withBrandSnapshot(item.campaign) }))
      .filter((item: any) => item.campaign?.status === 'completed' && isEscrowConfirmedCampaign(item.campaign));
  }, [user]);

  const getParticipationDetail = useCallback(async (participationId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_participants')
        .select(`
          *,
          campaign:campaigns (
            *,
            brand_profile:brand_profiles!brand_profile_id (*)
          )
        `)
        .eq('id', participationId)
        .single();

      if (error) throw error;
      const result = data ? { ...data, campaign: withBrandSnapshot(data.campaign) } : data;
      if (!result?.campaign || result.campaign.status !== 'live' || !isEscrowConfirmedCampaign(result.campaign)) return null;
      return result;
    } catch (err: any) {
      console.error('Error fetching participation detail:', err);
      return null;
    }
  }, []);

  const submitLink = useCallback(async (participationId: string, campaignId: string, tweetUrl: string) => {
    if (!user) throw new Error('Not authenticated');

    const { count, error: countError } = await supabase
      .from('campaign_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('participation_id', participationId);
    if (countError) throw countError;
    if (Number(count || 0) >= 10) {
      throw new Error('You have reached the maximum limit of 10 submissions for this campaign.');
    }

    const { data, error } = await supabase
      .from('campaign_submissions')
      .insert([
        { 
          participation_id: participationId, 
          campaign_id: campaignId,
          creator_id: user.id,
          tweet_url: tweetUrl,
          status: 'submitted'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [user]);

  const getParticipationSubmissions = useCallback(async (participationId: string) => {
    const { data, error } = await supabase
      .from('campaign_submissions')
      .select('*')
      .eq('participation_id', participationId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  }, []);

  const updateSubmissionStatus = useCallback(async (submissionId: string, status: 'approved' | 'revision' | 'rejected', feedback?: string) => {
    const response = await fetch(`${getBackendBaseUrl()}/submissions/${encodeURIComponent(submissionId)}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: await getBackendAuthHeaders(),
      body: JSON.stringify({ status, feedback })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || 'Submission status update failed');
    }

    return result.submission;
  }, []);

  const runPayoutAutomation = useCallback(async () => {
    const response = await fetch(`${getBackendBaseUrl()}/payouts/run`, {
      method: 'POST',
      credentials: 'include',
      headers: await getBackendAuthHeaders()
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || 'Payout automation failed');
    }

    return result;
  }, []);

  const finalizeCampaign = useCallback(async (campaignId: string) => {
    try {
      // 1. Fetch all approved submissions
      const { data: submissions, error: sError } = await supabase
        .from('campaign_submissions')
        .select(`
          *,
          creator_profile:creator_profiles!creator_id (*)
        `)
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');

      if (sError) throw sError;
      
      // If no approved submissions, just mark campaign completed
      if (!submissions || submissions.length === 0) {
        await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
        return;
      }

      // Settlement metrics and rewards are handled by the trusted backend.
      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId);

    } catch (err: any) {
      console.error('Error finalizing campaign:', err);
      throw err;
    }
  }, []);

  const getCampaignParticipants = useCallback(async (campaignId: string) => {
    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`
        *,
        creator_profile:creator_profiles!creator_id (*)
      `)
      .eq('campaign_id', campaignId);

    if (error) throw error;
    return data;
  }, []);

  const getAllSubmissions = useCallback(async (statusFilter?: string) => {
    let query = supabase
      .from('campaign_submissions')
      .select(`
        *,
        campaign:campaigns (*),
        creator_profile:creator_profiles!creator_id (*)
      `);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
    return data;
  }, []);

  return {
    campaigns,
    createCampaign,
    getCampaign,
    joinCampaign,
    checkParticipation,
    getCreatorActiveCampaigns,
    getCreatorPastCampaigns,
    getParticipationDetail,
    submitLink,
    getParticipationSubmissions,
    updateSubmissionStatus,
    runPayoutAutomation,
    finalizeCampaign,
    getCampaignParticipants,
    getAllSubmissions,
    loading,
    error,
    refreshCampaigns: fetchCampaigns
  };
}
