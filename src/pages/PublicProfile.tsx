import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Star, Target, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { mockCreatorProfile } from '../data/mock';

const appleEase = [0.16, 1, 0.3, 1];

export default function PublicProfile() {
  const { handle } = useParams();
  
  // In a real app, we would fetch the profile based on the handle.
  // For now, we'll just use the mock profile.
  const profile = mockCreatorProfile;

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 p-4 md:p-8">
      
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Sorsa
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: appleEase }}
          className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0">
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                className="w-32 h-32 rounded-[2rem] object-cover border-2 border-white/10"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold text-white tracking-tight">{profile.name}</h1>
                  <p className="text-cyan font-medium mt-1">{profile.handle}</p>
                  
                  <div className="flex items-center gap-2 text-muted mt-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{profile.country}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-muted leading-relaxed max-w-2xl">{profile.bio}</p>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {profile.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Score */}
          <div className="space-y-8">
            {/* Sorsa Score */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
              className="glass-panel rounded-[2rem] p-8 border border-white/10 text-center relative overflow-hidden h-full flex flex-col justify-center"
            >
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Sorsa Score</h3>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                  <circle 
                    cx="80" cy="80" r="72" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray="452.39" 
                    strokeDashoffset={452.39 - (452.39 * profile.sorsaScore) / 1000} 
                    className="text-cyan drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]" 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-white tracking-tighter">{profile.sorsaScore}</span>
                  <span className="text-xs text-cyan font-medium mt-1">/ 1000</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-5 h-5 ${star <= 4 ? 'text-cyan fill-cyan' : 'text-white/20'}`} />
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="text-left">
                  <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Base Reward</div>
                  <div className="text-xs text-muted">Based on Sorsa Score</div>
                </div>
                <div className="text-2xl font-bold text-cyan">${Math.floor(profile.sorsaScore / 10)}</div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Stats, Campaigns, Reviews */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <Target className="w-5 h-5 text-muted mb-3" />
                <div className="text-2xl font-semibold text-white mb-1">{profile.stats.campaignsCompleted}</div>
                <div className="text-xs text-muted font-medium">Campaigns</div>
              </div>
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <DollarSign className="w-5 h-5 text-muted mb-3" />
                <div className="text-2xl font-semibold text-white mb-1">${profile.stats.totalUsdcEarned}</div>
                <div className="text-xs text-muted font-medium">Earned</div>
              </div>
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <Star className="w-5 h-5 text-muted mb-3" />
                <div className="text-2xl font-semibold text-white mb-1">{profile.stats.sorsaPoints}</div>
                <div className="text-xs text-muted font-medium">Points</div>
              </div>
              <div className="glass-panel rounded-2xl p-5 border border-white/10">
                <Calendar className="w-5 h-5 text-muted mb-3" />
                <div className="text-lg font-semibold text-white mb-1 mt-1">{profile.stats.memberSince}</div>
                <div className="text-xs text-muted font-medium mt-1.5">Joined</div>
              </div>
            </motion.div>

            {/* Past Campaigns */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
              className="glass-panel rounded-[2rem] p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-6">Past Campaigns</h3>
              <div className="space-y-4">
                {profile.pastCampaigns.map(campaign => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <img src={campaign.brandLogo} alt={campaign.brand} className="w-10 h-10 rounded-full bg-white/10" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="font-medium text-white text-sm">{campaign.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted">{campaign.brand}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span className="text-xs text-muted">{campaign.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-cyan mb-1">+${campaign.earned}</div>
                      <div className="flex items-center gap-0.5 justify-end">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`w-3 h-3 ${star <= campaign.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Reviews */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.5 }}
              className="glass-panel rounded-[2rem] p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-6">Brand Reviews</h3>
              <div className="space-y-4">
                {profile.reviews.map(review => (
                  <div key={review.id} className="p-5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white text-sm">{review.brand}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
