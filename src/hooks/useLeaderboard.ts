import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getInitialsAvatarUrl, resolveCreatorAvatarUrl } from '../lib/avatars';

export interface LeaderboardCreator {
  id: string;
  handle: string;
  avatar: string;
  sorsaScore: number;
  points: number;
  campaignsCompleted: number;
}

const FALLBACK_CAMPAIGNS_COMPLETED_EXCLUDED_HANDLES = new Set([
  'goatxii3',
  'yusufplug_',
  'tmdefi',
  'khaliddesigns',
]);

function getCampaignEndTime(endDate?: string | null) {
  if (!endDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
    return new Date(`${endDate}T23:59:59`).getTime();
  }
  const time = new Date(endDate).getTime();
  return Number.isNaN(time) ? null : time;
}

function isCompletedParticipation(participation: any) {
  if (participation.status === 'rejected') return false;
  const campaign = Array.isArray(participation.campaign) ? participation.campaign[0] : participation.campaign;
  if (!campaign) return false;
  if (campaign.status === 'completed') return true;
  const endTime = getCampaignEndTime(campaign.end_date);
  return Boolean(endTime && endTime <= Date.now());
}

export function useLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data: creatorProfiles, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('id, x_handle, full_name, avatar_url, sorsa_score, activity_points, campaigns_completed');

      if (creatorError) throw creatorError;

      const creatorIds = (creatorProfiles || []).map((profile) => profile.id);
      const { data: authProfiles, error: profileError } = creatorIds.length
        ? await supabase
            .from('profiles')
            .select('id, role, full_name, avatar_url')
            .in('id', creatorIds)
        : { data: [], error: null };

      if (profileError) throw profileError;

      const authProfileById = new Map((authProfiles || []).map((profile) => [profile.id, profile]));
      const completedCampaignsByCreator = new Map<string, number>();
      const campaignsCompletedExcludedCreatorIds = new Set<string>();

      if (creatorIds.length) {
        const [
          { data: participations, error: participationError },
          { data: exclusions, error: exclusionsError },
        ] = await Promise.all([
          supabase
            .from('campaign_participants')
            .select(`
              creator_id,
              status,
              campaign:campaigns (
                status,
                end_date
              )
            `)
            .in('creator_id', creatorIds)
            .neq('status', 'rejected'),
          supabase
            .from('leaderboard_campaign_completion_exclusions')
            .select('creator_id')
            .in('creator_id', creatorIds),
        ]);

        if (participationError) {
          console.warn('Could not derive leaderboard campaign counts:', participationError);
        } else {
          for (const participation of participations || []) {
            if (!isCompletedParticipation(participation)) continue;
            completedCampaignsByCreator.set(
              participation.creator_id,
              (completedCampaignsByCreator.get(participation.creator_id) || 0) + 1,
            );
          }
        }

        if (exclusionsError) {
          console.warn('Could not load campaign leaderboard exclusions:', exclusionsError);
        } else {
          for (const exclusion of exclusions || []) {
            campaignsCompletedExcludedCreatorIds.add(exclusion.creator_id);
          }
        }
      }

      const mappedData: LeaderboardCreator[] = (creatorProfiles || [])
        .filter((profile) => {
          const authProfile = authProfileById.get(profile.id) as any;
          return authProfile?.role === 'creator';
        })
        .map((profile) => {
          const authProfile = authProfileById.get(profile.id) as any;
          const handle = profile.x_handle || authProfile?.full_name || 'Unknown';
          const avatar =
            resolveCreatorAvatarUrl(profile.avatar_url, authProfile?.avatar_url) ||
            getInitialsAvatarUrl(profile.full_name || authProfile?.full_name || handle);

          return {
            id: profile.id,
            handle,
            avatar,
            sorsaScore: profile.sorsa_score || 0,
            points: profile.activity_points || 0,
            campaignsCompleted: campaignsCompletedExcludedCreatorIds.has(profile.id) ||
              FALLBACK_CAMPAIGNS_COMPLETED_EXCLUDED_HANDLES.has(String(handle || '').toLowerCase())
              ? 0
              : Math.max(
                  Number(profile.campaigns_completed || 0),
                  completedCampaignsByCreator.get(profile.id) || 0,
                ),
          };
        });

      setLeaderboard(mappedData);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refreshLeaderboard: fetchLeaderboard,
    currentUserId: user?.id,
  };
}
