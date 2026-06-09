import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeAvatarUrl } from '../lib/avatars';

export default function BrandAuthCallback() {
  const navigate = useNavigate();
  const [errorVisible, setErrorVisible] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const handleAuth = async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured');

        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error_description');
        if (oauthError) throw new Error(oauthError);

        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, document.title, '/auth/callback/brand');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error(sessionError?.message || 'No session found after redirect');

        const user = session.user;
        const metadata = user.user_metadata;
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const avatarUrl = normalizeAvatarUrl(metadata.avatar_url);

        const { data: existingProfile, error: existingProfileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();
        if (existingProfileError) throw existingProfileError;

        if (existingProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          if (profileError) throw profileError;
        } else {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            role: 'brand',
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });
          if (profileError) throw profileError;

          const { error: updateError } = await supabase.auth.updateUser({ data: { role: 'brand' } });
          if (updateError) throw updateError;
        }

        setTimeout(() => navigate('/brand/profiles'), 500);
      } catch (err) {
        console.error('Brand auth callback error:', err);
        setErrorVisible(true);
      }
    };

    handleAuth();
  }, [navigate]);

  if (errorVisible) {
    return (
      <div className="min-h-screen bg-black flex flex-col gap-4 items-center justify-center text-red-400">
        <p>Authentication could not be completed.</p>
        <button className="text-white underline" onClick={() => navigate('/auth/brand')}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium animate-pulse">Syncing Brand Account...</p>
      </div>
    </div>
  );
}
