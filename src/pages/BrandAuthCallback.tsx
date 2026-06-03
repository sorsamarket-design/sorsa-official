import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeAvatarUrl } from '../lib/avatars';

export default function BrandAuthCallback() {
  const navigate = useNavigate();
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured');

        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error(sessionError?.message || 'No session found after redirect');

        const user = session.user;
        const metadata = user.user_metadata;
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const avatarUrl = normalizeAvatarUrl(metadata.avatar_url);

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          role: 'brand',
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;

        const { error: updateError } = await supabase.auth.updateUser({ data: { role: 'brand' } });
        if (updateError) throw updateError;
        setTimeout(() => navigate('/campaigns'), 500);
      } catch (err) {
        console.error('Brand auth callback error:', err);
        setErrorVisible(true);
      }
    };

    handleAuth();
  }, [navigate]);

  if (errorVisible) return <div className="min-h-screen bg-black flex items-center justify-center text-red-400">Error</div>;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium animate-pulse">Syncing Brand Account...</p>
      </div>
    </div>
  );
}
