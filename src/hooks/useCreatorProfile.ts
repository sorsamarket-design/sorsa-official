import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type CreatorProfileContextValue = {
  profile: any;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
};

const CreatorProfileContext = createContext<CreatorProfileContextValue | null>(null);

export function CreatorProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, role, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (authLoading) return;

    if (!userId || role !== 'creator') {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching creator profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, role, userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const value = useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile: fetchProfile,
    setProfile
  }), [error, fetchProfile, loading, profile]);

  return React.createElement(CreatorProfileContext.Provider, { value }, children);
}

export function useCreatorProfile() {
  const context = useContext(CreatorProfileContext);
  if (!context) {
    throw new Error('useCreatorProfile must be used within CreatorProfileProvider');
  }
  return context;
}
