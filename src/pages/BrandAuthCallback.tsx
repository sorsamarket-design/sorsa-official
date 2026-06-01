import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function BrandAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error(sessionError?.message || 'No session found after redirect');
        }

        const user = session.user;
        const metadata = user.user_metadata;
        
        // Handle X (Twitter) metadata variations
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0];
        const avatarUrl = metadata.avatar_url;

        // 1. Update profiles table with brand role
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: 'brand',
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile DB error:', profileError);
          throw new Error(`Database Error (profiles): ${profileError.message}`);
        }

        // 2. Update local session metadata for AuthContext
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: 'brand' }
        });

        if (updateError) throw updateError;

        // Give the session refresh a tiny moment to propagate
        setTimeout(() => {
          navigate('/brand/dashboard');
        }, 500);

      } catch (err: any) {
        console.error('CRITICAL BRAND AUTH ERROR:', err);
        alert(`Auth Error: ${err.message}. Check browser console for details.`);
        navigate('/auth/brand');
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium animate-pulse">Syncing Brand Account...</p>
      </div>
    </div>
  );
}
