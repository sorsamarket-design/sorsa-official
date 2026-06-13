import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { XLogo } from '../components/XLogo';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function CreatorLogin() {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [errorVisible, setErrorVisible] = React.useState(false);

  const handleTwitterLogin = async () => {
    setIsLoggingIn(true);
    setErrorVisible(false);

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'x',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
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
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl flex flex-col items-center text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative z-10"><XLogo className="w-10 h-10 text-white" /></div>
            <h1 className="text-3xl font-semibold tracking-tight mb-4 text-white relative z-10">Creator Access</h1>
            <p className="text-muted leading-relaxed mb-10 max-w-xs mx-auto relative z-10">We use your X account to verify your identity and follower count.</p>
            <button onClick={handleTwitterLogin} disabled={isLoggingIn} className="w-full py-4 rounded-full bg-white text-black font-semibold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 disabled:opacity-50 disabled:cursor-not-allowed">
              <XLogo className="w-5 h-5 text-black" />
              {isLoggingIn ? 'Connecting...' : 'Connect with X'}
            </button>
            {errorVisible && <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm relative z-10">Error</div>}
            <p className="mt-8 text-xs text-muted max-w-[250px] mx-auto relative z-10">By connecting, you agree to SorsaMarket's Terms of Service and Privacy Policy.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
