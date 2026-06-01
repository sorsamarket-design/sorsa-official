import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, DollarSign, Clock, Star, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { mockCampaignDetail, mockJoinedCreators, mockSubmissions } from '../data/mock';

const appleEase = [0.16, 1, 0.3, 1];

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'creators' | 'submissions' | 'brief'>('creators');
  
  // Local state for submissions to handle UI interactions
  const [submissions, setSubmissions] = useState(mockSubmissions);

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              onClick={() => navigate('/brand/dashboard')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.img 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: appleEase }}
                  src={mockCampaignDetail.brandLogo} 
                  alt={mockCampaignDetail.brandName} 
                  className="w-12 h-12 rounded-2xl object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                    className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
                  >
                    {mockCampaignDetail.title}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      mockCampaignDetail.status === 'Live' ? 'bg-cyan/10 text-cyan border-cyan/20' :
                      mockCampaignDetail.status === 'Ended' ? 'bg-white/10 text-muted border-white/20' :
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {mockCampaignDetail.status}
                    </span>
                  </motion.h1>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                    className="flex items-center gap-2 mt-2"
                  >
                    {mockCampaignDetail.categories.map(cat => (
                      <span key={cat} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-muted font-medium">
                        {cat}
                      </span>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="glass-panel rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider">
                <Users className="w-4 h-4" /> Creators Joined
              </div>
              <div className="text-2xl font-semibold text-white">{mockCampaignDetail.stats.creatorsJoined}</div>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider">
                <DollarSign className="w-4 h-4" /> Budget
              </div>
              <div className="text-2xl font-semibold text-white">${mockCampaignDetail.stats.budget.toLocaleString()}</div>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider">
                <Clock className="w-4 h-4" /> Days Remaining
              </div>
              <div className="text-2xl font-semibold text-white">{mockCampaignDetail.stats.daysRemaining}</div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
            className="flex items-center gap-2 mb-6 border-b border-white/10 pb-px"
          >
            {[
              { id: 'creators', label: 'Creators' },
              { id: 'submissions', label: 'Submissions' },
              { id: 'brief', label: 'Campaign Brief' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.id ? 'text-white' : 'text-muted hover:text-white'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan"
                  />
                )}
              </button>
            ))}
          </motion.div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'creators' && (
              <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">X Handle</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Sorsa Score</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Followers</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Joined Date</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Submission Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockJoinedCreators.map((creator) => (
                        <tr key={creator.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 text-white font-medium">{creator.handle}</td>
                          <td className="p-6">
                            <span className="flex items-center gap-1 text-cyan font-semibold">
                              <Star className="w-4 h-4 fill-cyan text-cyan" /> {creator.score}
                            </span>
                          </td>
                          <td className="p-6 text-white">{creator.followers}</td>
                          <td className="p-6 text-muted">{creator.joinedDate}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center justify-center ${
                              creator.status === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              creator.status === 'Submitted' ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                              'bg-white/10 text-muted border border-white/20'
                            }`}>
                              {creator.status === 'Approved' ? 'Completed' : creator.status === 'Submitted' ? 'Under Review' : 'Joined'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{sub.creatorName}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 border ${
                          sub.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          sub.status === 'Revision Requested' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-cyan/10 text-cyan border-cyan/20'
                        }`}>
                          {sub.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.status === 'Revision Requested' && <AlertCircle className="w-3 h-3" />}
                          {sub.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {sub.status === 'Approved' ? 'Completed' : sub.status === 'Pending' ? 'Under Review' : sub.status}
                        </span>
                      </div>
                      <a href={sub.link} target="_blank" rel="noreferrer" className="text-sm text-cyan hover:underline flex items-center gap-1 w-fit">
                        View Submission <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'brief' && (
              <div className="glass-panel rounded-[2rem] p-8 border border-white/10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Campaign Objectives</h3>
                  <p className="text-muted leading-relaxed">{mockCampaignDetail.brief.objectives}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Spotlight Requests</h3>
                    <ul className="space-y-2">
                      {mockCampaignDetail.brief.spotlightRequests.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted">
                          <CheckCircle2 className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Requirements</h3>
                    <ul className="space-y-2">
                      {mockCampaignDetail.brief.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted">
                          <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-2 text-muted">
                        <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <span>Follow @{mockCampaignDetail.xHandle} on X</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center gap-8">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Start Date</p>
                    <p className="text-white font-medium">{mockCampaignDetail.brief.startDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">End Date</p>
                    <p className="text-white font-medium">{mockCampaignDetail.brief.endDate}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
