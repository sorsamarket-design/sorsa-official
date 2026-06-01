import { useState, useEffect, useCallback } from 'react';
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
  created_at: string;
}

export function useBrandProfiles() {
  const { user, role } = useAuth();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!user || role !== 'brand') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setProfiles(data || []);
      
      // If no profile is selected, auto-select the first one
      if (data && data.length > 0) {
        const savedProfileId = localStorage.getItem('selectedBrandProfileId');
        if (savedProfileId && data.some(p => p.id === savedProfileId)) {
          setSelectedProfileId(savedProfileId);
        } else {
          setSelectedProfileId(data[0].id);
          localStorage.setItem('selectedBrandProfileId', data[0].id);
        }
      } else {
        setSelectedProfileId(null);
      }
    } catch (err: any) {
      console.error('Error fetching brand profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const selectProfile = (id: string) => {
    setSelectedProfileId(id);
    localStorage.setItem('selectedBrandProfileId', id);
  };

  const createProfile = async (profileData: Omit<BrandProfile, 'id' | 'owner_id' | 'created_at'>, logoFile?: File) => {
    if (!user) throw new Error('Not authenticated');

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

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  return {
    profiles,
    selectedProfile,
    selectedProfileId,
    selectProfile,
    createProfile,
    loading,
    error,
    refreshProfiles: fetchProfiles
  };
}
