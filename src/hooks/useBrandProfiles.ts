import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface BrandProfile {
  id: string;
  owner_id: string;
  company_name: string;
  logo_url: string;
  description: string;
  website: string;
  twitter_handle: string;
  telegram_handle?: string;
  created_at: string;
}

export const MAX_BRAND_PROFILES = 3;

type BrandProfilesContextValue = {
  profiles: BrandProfile[];
  selectedProfile: BrandProfile | null;
  selectedProfileId: string | null;
  selectProfile: (id: string) => void;
  createProfile: (profileData: Omit<BrandProfile, 'id' | 'owner_id' | 'created_at'>, logoFile?: File) => Promise<BrandProfile>;
  updateProfile: (id: string, profileData: Partial<Omit<BrandProfile, 'id' | 'owner_id' | 'created_at'>>, logoFile?: File) => Promise<BrandProfile>;
  loading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
};

const BrandProfilesContext = createContext<BrandProfilesContextValue | null>(null);

export function BrandProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const storageKey = user?.id ? `selectedBrandProfileId:${user.id}` : 'selectedBrandProfileId';

  const fetchProfiles = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setProfiles([]);
      setSelectedProfileId(null);
      setError(null);
      hasLoadedRef.current = false;
      setLoading(false);
      return;
    }

    try {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setProfiles(data || []);
      
      // If no profile is selected, auto-select the first one
      if (data && data.length > 0) {
        const savedProfileId = localStorage.getItem(storageKey) || localStorage.getItem('selectedBrandProfileId');
        if (savedProfileId && data.some(p => p.id === savedProfileId)) {
          setSelectedProfileId(savedProfileId);
        } else {
          setSelectedProfileId(data[0].id);
          localStorage.setItem(storageKey, data[0].id);
        }
      } else {
        setSelectedProfileId(null);
      }
    } catch (err: any) {
      console.error('Error fetching brand profiles:', err);
      setError(err.message);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [authLoading, storageKey, user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const selectProfile = (id: string) => {
    setSelectedProfileId(id);
    localStorage.setItem(storageKey, id);
  };

  const createProfile = async (profileData: Omit<BrandProfile, 'id' | 'owner_id' | 'created_at'>, logoFile?: File) => {
    if (!user) throw new Error('Not authenticated');

    const { count, error: countError } = await supabase
      .from('brand_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) throw countError;
    if ((count || 0) >= MAX_BRAND_PROFILES) {
      throw new Error(`You can create up to ${MAX_BRAND_PROFILES} brand profiles per account.`);
    }

    let logoUrl = profileData.logo_url;

    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath);

      logoUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from('brand_profiles')
      .insert([
        { ...profileData, owner_id: user.id, logo_url: logoUrl }
      ])
      .select()
      .single();

    if (error) throw error;
    
    await fetchProfiles();
    selectProfile(data.id);
    return data;
  };

  const updateProfile = async (
    id: string,
    profileData: Partial<Omit<BrandProfile, 'id' | 'owner_id' | 'created_at'>>,
    logoFile?: File
  ) => {
    if (!user) throw new Error('Not authenticated');

    let logoUrl = profileData.logo_url;

    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath);

      logoUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from('brand_profiles')
      .update({ ...profileData, logo_url: logoUrl })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) throw error;

    setProfiles((current) => current.map((profile) => profile.id === data.id ? data : profile));
    if (selectedProfileId === data.id) {
      setSelectedProfileId(data.id);
    }
    await fetchProfiles();
    return data;
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  const value = useMemo(() => ({
    profiles,
    selectedProfile,
    selectedProfileId,
    selectProfile,
    createProfile,
    updateProfile,
    loading,
    error,
    refreshProfiles: fetchProfiles
  }), [createProfile, error, fetchProfiles, loading, profiles, selectedProfile, selectedProfileId, updateProfile]);

  return React.createElement(BrandProfilesContext.Provider, { value }, children);
}

export function useBrandProfiles() {
  const context = useContext(BrandProfilesContext);
  if (!context) {
    throw new Error('useBrandProfiles must be used within BrandProfilesProvider');
  }
  return context;
}
