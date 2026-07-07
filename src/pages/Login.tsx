import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-[#F5F5F7] font-sans flex flex-col items-center justify-center p-6 selection:bg-cyan/30">
      <div className="w-full max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: appleEase }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/AtlasReachLogo.PNG" alt="Logo" className="w-8 h-8 object-contain" />
            <div className="text-xl font-semibold tracking-tight text-white">AtlasReach</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-white">Welcome to AtlasReach</h1>
          <p className="text-lg text-muted">Choose how you want to use the platform.</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5 md:gap-6">
          {/* Brand Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
            onClick={() => navigate('/auth/brand')}
            className="relative rounded-[2.5rem] p-[1px] overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="glass-panel rounded-[2.5rem] p-4 md:p-10 flex flex-col items-start h-full w-full bg-black/40 backdrop-blur-3xl relative overflow-hidden">
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-white/10 flex items-center justify-center mb-3 md:mb-8 border border-white/5 group-hover:bg-cyan/10 group-hover:border-cyan/30 transition-colors">
                <Building2 className="w-4 h-4 md:w-7 md:h-7 text-white group-hover:text-cyan transition-colors" />
              </div>
              <h2 className="text-base md:text-3xl font-semibold mb-2 md:mb-4 tracking-tight text-white">I'm a Brand</h2>
              <p className="text-[0.72rem] md:text-base text-muted leading-relaxed mb-4 md:mb-10 flex-1">
                Launch campaigns, find the perfect creators, and pay only for verified results. Scale your reach authentically.
              </p>
              <button className="w-full px-3 py-2.5 md:py-4 rounded-full bg-white text-black text-xs md:text-base font-medium flex items-center justify-center gap-2 group-hover:bg-cyan group-hover:text-black transition-colors">
                Continue as Brand <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Creator Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            onClick={() => navigate('/auth/creator')}
            className="relative rounded-[2.5rem] p-[1px] overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="glass-panel rounded-[2.5rem] p-4 md:p-10 flex flex-col items-start h-full w-full bg-black/40 backdrop-blur-3xl relative overflow-hidden">
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-white/10 flex items-center justify-center mb-3 md:mb-8 border border-white/5 group-hover:bg-cyan/10 group-hover:border-cyan/30 transition-colors">
                <UserCircle2 className="w-4 h-4 md:w-7 md:h-7 text-white group-hover:text-cyan transition-colors" />
              </div>
              <h2 className="text-base md:text-3xl font-semibold mb-2 md:mb-4 tracking-tight text-white">I'm a Creator</h2>
              <p className="text-[0.72rem] md:text-base text-muted leading-relaxed mb-4 md:mb-10 flex-1">
                Browse premium campaigns, apply with one click, and get paid securely for your authentic engagement.
              </p>
              <button className="w-full px-3 py-2.5 md:py-4 rounded-full bg-white text-black text-xs md:text-base font-medium flex items-center justify-center gap-2 group-hover:bg-cyan group-hover:text-black transition-colors">
                Continue as Creator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
