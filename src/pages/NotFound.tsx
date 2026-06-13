import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, ArrowLeft } from 'lucide-react';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan/10 blur-[120px] rounded-full pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: appleEase }}
        className="relative z-10 max-w-md w-full glass-panel rounded-[2rem] p-10 border border-white/10 text-center shadow-2xl"
      >
        <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <Compass className="w-10 h-10 text-cyan" />
        </div>
        
        <h1 className="text-3xl font-semibold text-white tracking-tight mb-3">
          Sorry, you are lost
        </h1>
        
        <p className="text-muted leading-relaxed mb-8">
          This page has not been found or hasn't been built yet. Let's get you back on track.
        </p>

        <button 
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-white text-black font-semibold hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </button>
      </motion.div>
    </div>
  );
}
