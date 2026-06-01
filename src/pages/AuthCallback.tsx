import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Wait a small moment for Supabase to process the hash if it hasn't yet
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error(sessionError?.message || 'No session found after redirect');
        }

        const user = session.user;
        const metadata = user.user_metadata;
        
        // Handle X (Twitter) metadata variations
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const xHandle = metadata.user_name || metadata.preferred_username || user.email?.split('@')[0];
        const avatarUrl = metadata.avatar_url;

        // 1. Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: 'creator',
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile DB error:', profileError);
          throw new Error(`Database Error (profiles): ${profileError.message}`);
        }

        // 2. Check for existing creator profile/score
        const { data: existingProfile, error: checkError } = await supabase
          .from('creator_profiles')
          .select('sorsa_score')
          .eq('id', user.id)
          .single();

        const { error: creatorError } = await supabase
          .from('creator_profiles')
          .upsert({
            id: user.id,
            x_handle: xHandle,
          });

        if (creatorError) {
          console.error('Creator Profile DB error:', creatorError);
          throw new Error(`Database Error (creator_profiles): ${creatorError.message}`);
        }

        // 3. ONLY Sync if this is a first-time user (no score yet)
        if (!existingProfile?.sorsa_score) {
          try {
            console.log('First-time login detected. Syncing Sorsa stats...');
            const { default: sorsaApi } = await import('../lib/sorsaApi');
            const [score, stats, about] = await Promise.all([
              sorsaApi.fetchScore(xHandle),
              sorsaApi.fetchInfo(xHandle),
              sorsaApi.fetchAbout(xHandle)
            ]);

            const finalLocation = stats.location || about?.country || null;

            const { error: dbUpdateError } = await supabase
              .from('creator_profiles')
              .update({
                sorsa_score: score,
                follower_count: stats.followers_count,
                avatar_url: stats.profile_image_url,
                bio: stats.description,
                country: finalLocation,
                full_name: stats.display_name,
                last_profile_sync_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (dbUpdateError) throw dbUpdateError;

            console.log(`Sorsa API Sync Success! Saved Location: ${finalLocation || 'NONE'}`);


          } catch (sorsaErr) {
            console.warn('Initial Sorsa sync failed (skipping):', sorsaErr);
            alert(`Sorsa API Sync Failed:\n${sorsaErr.message}`);
          }
        } else {
          console.log('Returning creator detected. Skipping Sorsa API call.');
        }

        // 4. Update local session metadata for AuthContext
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: 'creator' }
        });

        if (updateError) throw updateError;

        // Give the session refresh a tiny moment to propagate
        setTimeout(() => {
          navigate('/creator/dashboard');
        }, 500);

      } catch (err) {
        console.error('CRITICAL AUTH ERROR:', err);
        // Alert the user so we can see what happened
        alert(`Auth Error: ${err.message}. Check browser console for details.`);
        navigate('/login');
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium animate-pulse">Syncing your account...</p>
      </div>
    </div>
  );
}
