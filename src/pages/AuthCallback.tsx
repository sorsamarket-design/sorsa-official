import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeAvatarUrl } from '../lib/avatars';
import { attachSavedReferralToCreator, buildReferralCode, ensureCreatorReferralCode } from '../lib/referrals';
import sorsaApi from '../lib/sorsaApi';

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown authentication error';
}

async function completeSupabaseRedirect() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const oauthError = searchParams.get('error_description') || hashParams.get('error_description');
  if (oauthError) throw new Error(oauthError);

  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState({}, document.title, '/auth/callback');
    return;
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    window.history.replaceState({}, document.title, '/auth/callback');
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const handleAuth = async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured');

        await completeSupabaseRedirect();

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error(sessionError?.message || 'No session found after redirect');

        const user = session.user;
        const metadata = user.user_metadata;
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const xHandle = metadata.user_name || metadata.preferred_username || user.email?.split('@')[0];
        const avatarUrl = normalizeAvatarUrl(metadata.avatar_url);
        const xProviderId = metadata.provider_id || metadata.sub || null;

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
            full_name: fullName,
            avatar_url: avatarUrl,
            x_provider_id: xProviderId,
            referral_code: referralCode,
          });
          if (creatorError) throw creatorError;

          await attachSavedReferralToCreator(user.id);
          try {
            await sorsaApi.syncCreatorProfile();
          } catch (syncError) {
            console.warn('First-login Sorsa profile sync failed:', syncError);
          }
        } else {
          await ensureCreatorReferralCode(user.id, xHandle);
        }

        const { error: updateError } = await supabase.auth.updateUser({ data: { role: 'creator' } });
        if (updateError) throw updateError;
        setTimeout(() => navigate('/campaigns'), 500);
      } catch (err) {
        console.error('Auth callback error:', err);
        setErrorMessage(getAuthErrorMessage(err));
        setErrorVisible(true);
      }
    };

    handleAuth();
  }, [navigate]);

  if (errorVisible) {
    return (
      <div className="min-h-screen bg-black flex flex-col gap-4 items-center justify-center text-red-400">
        <p>Authentication could not be completed.</p>
        {errorMessage && (
          <p className="max-w-sm rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm leading-relaxed text-red-300">
            {errorMessage}
          </p>
        )}
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
