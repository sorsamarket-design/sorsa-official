import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1];

export default function BrandRegister() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }

    setIsRegistering(true);
    
    try {
      // 1. Sign up with role metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'brand'
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // If Supabase returns a user but NO session, it means email confirmation is required
        if (!data.session) {
          setIsRegistered(true);
        } else {
          // If auto-confirm is on (or already confirmed), we go to profile setup
          navigate('/brand/profiles/new');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during registration');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#F5F5F7] font-sans flex flex-col items-center justify-center p-6 selection:bg-cyan/30">
      <div className="w-full max-w-md">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: appleEase }}
          onClick={() => navigate('/auth/brand')}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </motion.button>

        {isRegistered ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2.5rem] p-8 md:p-12 border border-white/10 text-center space-y-6 bg-black/40 backdrop-blur-3xl"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Check your email</h2>
            <p className="text-muted leading-relaxed">
              We've sent a confirmation link to <span className="text-white font-medium">{email}</span>. 
              Please click the link to verify your account and continue.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => navigate('/auth/brand')}
                className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:scale-[1.02] transition-transform duration-300 flex items-center gap-2 mx-auto"
              >
                Return to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
            className="relative rounded-[2.5rem] p-[1px] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl border border-white/10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/10 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="text-center mb-10 relative z-10">
                <h1 className="text-3xl font-semibold tracking-tight mb-3 text-white">Create Account</h1>
                <p className="text-muted">Join SorsaMarket as a Brand</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all placeholder:text-muted"
                    placeholder="brand@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all placeholder:text-muted"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all placeholder:text-muted"
                    placeholder="••••••••"
                  />
                </div>
                
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {errorMessage}
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-4 mt-8 rounded-full bg-white text-black font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50"
                >
                  {isRegistering ? 'Creating Account...' : 'Register Account'}
                </button>
              </form>

              <div className="mt-8 text-center relative z-10">
                <p className="text-muted text-sm">
                  Already have an account?{' '}
                  <button 
                    onClick={() => navigate('/auth/brand')}
                    className="text-cyan hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
