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
            .select('id, full_name, avatar_url')
            .in('id', creatorIds)
        : { data: [], error: null };

      if (profileError) throw profileError;

      const authProfileById = new Map((authProfiles || []).map((profile) => [profile.id, profile]));

      const mappedData: LeaderboardCreator[] = (creatorProfiles || []).map((profile) => {
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
          campaignsCompleted: profile.campaigns_completed || 0,
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