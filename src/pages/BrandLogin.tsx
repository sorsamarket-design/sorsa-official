import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { TimedPasswordInput } from '../components/TimedPasswordInput';
import { XLogo } from '../components/XLogo';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1];

export default function BrandLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorVisible(false);

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/brand/profiles');
    } catch (err) {
      console.error('Email login error:', err);
      setErrorVisible(true);
      setIsLoggingIn(false);
    }
  };

  const handleTwitterLogin = async () => {
    setIsLoggingIn(true);
    setErrorVisible(false);

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'x',
        options: { redirectTo: window.location.origin + '/auth/callback/brand' },
      });

      if (error) throw error;
    } catch (err) {
      console.error('X login error:', err);
      setErrorVisible(true);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#F5F5F7] font-sans flex flex-col items-center justify-center p-6 selection:bg-cyan/30">
      <div className="w-full max-w-md">
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: appleEase }} onClick={() => navigate('/login')} className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to roles
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }} className="relative rounded-[2.5rem] p-[1px] overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="text-center mb-10 relative z-10"><h1 className="text-3xl font-semibold tracking-tight mb-3 text-white">Brand Sign In</h1><p className="text-muted">Welcome back to SorsaMarket</p></div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {errorVisible && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">Error</div>}
              <div><label className="block text-sm font-medium text-white/80 mb-2">Email Address</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all placeholder:text-muted" placeholder="brand@company.com" /></div>
              <TimedPasswordInput label="Password" required value={password} onChange={setPassword} />
              <button type="submit" disabled={isLoggingIn} className="w-full py-4 mt-4 rounded-full bg-white text-black font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50">{isLoggingIn ? 'Signing in...' : 'Sign in with Email'}</button>
            </form>

            <div className="relative my-8 flex items-center z-10"><div className="flex-grow border-t border-white/10"></div><span className="flex-shrink-0 mx-4 text-muted text-sm font-medium">OR</span><div className="flex-grow border-t border-white/10"></div></div>
            <button type="button" onClick={handleTwitterLogin} disabled={isLoggingIn} className="w-full py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium flex items-center justify-center gap-3 hover:bg-white/10 transition-colors relative z-10 disabled:opacity-50"><XLogo className="w-5 h-5 text-white" />{isLoggingIn ? 'Connecting...' : 'Continue with X'}</button>

            <div className="mt-8 text-center relative z-10"><p className="text-muted text-sm">Don't have an account? <button onClick={() => navigate('/auth/brand/register')} className="text-cyan hover:underline font-medium">Register</button></p></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
