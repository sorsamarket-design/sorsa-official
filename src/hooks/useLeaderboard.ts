import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
      const { data, error: fetchError } = await supabase
        .from('creator_profiles')
        .select('id, x_handle, avatar_url, sorsa_score, activity_points, campaigns_completed');

      if (fetchError) throw fetchError;

      const mappedData: LeaderboardCreator[] = (data || []).map(p => ({
        id: p.id,
        handle: p.x_handle || 'Unknown',
        avatar: p.avatar_url || 'https://picsum.photos/seed/default/100/100',
        sorsaScore: p.sorsa_score || 0,
        points: p.activity_points || 0,
        campaignsCompleted: p.campaigns_completed || 0
      }));

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
    currentUserId: user?.id
  };
}
