import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeAvatarUrl } from '../lib/avatars';
import { attachSavedReferralToCreator, buildReferralCode, ensureCreatorReferralCode } from '../lib/referrals';

export default function AuthCallback() {
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
          window.history.replaceState({}, document.title, '/auth/callback');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error(sessionError?.message || 'No session found after redirect');

        const user = session.user;
        const metadata = user.user_metadata;
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const xHandle = metadata.user_name || metadata.preferred_username || user.email?.split('@')[0];
        const avatarUrl = normalizeAvatarUrl(metadata.avatar_url);

        const { data: existingProfile, error: existingProfileError } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (existingProfileError) throw existingProfileError;

        if (!existingProfile) {
          const referralCode = buildReferralCode(xHandle, user.id);
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            role: 'creator',
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });
          if (profileError) throw profileError;

          const { error: creatorError } = await supabase.from('creator_profiles').insert({
            id: user.id,
            x_handle: xHandle,
            referral_code: referralCode,
          });
          if (creatorError) throw creatorError;

          await attachSavedReferralToCreator(user.id);

          try {
            const { default: sorsaApi } = await import('../lib/sorsaApi');
            const [score, stats, about] = await Promise.race([
              Promise.all([
                sorsaApi.fetchScore(xHandle),
                sorsaApi.fetchInfo(xHandle),
                sorsaApi.fetchAbout(xHandle),
              ]),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Initial Sorsa sync timed out')), 15_000)
              ),
            ]);
            const finalLocation = stats.location || about?.country || null;
            await supabase.from('creator_profiles').update({
              sorsa_score: score,
              follower_count: stats.followers_count,
              avatar_url: normalizeAvatarUrl(stats.profile_image_url),
              bio: stats.description,
              country: finalLocation,
              full_name: stats.display_name,
              last_profile_sync_at: new Date().toISOString(),
            }).eq('id', user.id);
          } catch (sorsaErr) {
            console.warn('Initial Sorsa sync failed:', sorsaErr);
          }
        } else {
          await ensureCreatorReferralCode(user.id, xHandle);
        }

        const { error: updateError } = await supabase.auth.updateUser({ data: { role: 'creator' } });
        if (updateError) throw updateError;
        setTimeout(() => navigate('/campaigns'), 500);
      } catch (err) {
        console.error('Auth callback error:', err);
        setErrorVisible(true);
      }
    };

    handleAuth();
  }, [navigate]);

  if (errorVisible) {
    return (
      <div className="min-h-screen bg-black flex flex-col gap-4 items-center justify-center text-red-400">
        <p>Authentication could not be completed.</p>
        <button className="text-white underline" onClick={() => navigate('/auth/creator')}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium animate-pulse">Syncing your account...</p>
      </div>
    </div>
  );
}
