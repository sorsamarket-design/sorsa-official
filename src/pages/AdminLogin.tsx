import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { createAppSession } from '../lib/appSession';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setErrorVisible(false);

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error('Login failed');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Not an admin account');
      }

      if (data.session?.access_token) {
        await createAppSession(data.session.access_token);
      }
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      setErrorVisible(true);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#F5F5F7] font-sans flex flex-col items-center justify-center p-6 selection:bg-purple-500/30">
      <div className="w-full max-w-md">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: appleEase }}
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
          className="relative rounded-[2.5rem] p-[1px] overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-transparent to-white/5 opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="text-center mb-10 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mb-3 text-white">Admin Sign In</h1>
              <p className="text-muted">Restricted AtlasReach access</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {errorVisible && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  Error
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all placeholder:text-muted"
                  placeholder="admin@sorsa.market"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all placeholder:text-muted"
                  placeholder="password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 mt-4 rounded-full bg-white text-black font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign in with Email'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
