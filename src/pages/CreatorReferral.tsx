import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, CheckCircle2, Users, Star, ArrowRight, X } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { supabase } from '../lib/supabase';
import { buildReferralCode, ensureCreatorReferralCode } from '../lib/referrals';

const appleEase = [0.16, 1, 0.3, 1] as const;

function slugifyReferralName(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreatorReferral() {
  const [copied, setCopied] = useState(false);
  const [showPointScale, setShowPointScale] = useState(false);
  const [search, setSearch] = useState('');
  const [referralActivity, setReferralActivity] = useState<Array<{ id: string; username: string; score: number; date: string; status: string; points: number }>>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const { user } = useAuth();
  const { profile, refreshProfile } = useCreatorProfile();
  const referralCode = profile?.referral_code || buildReferralCode(profile?.x_handle, user?.id);
  const referrerName = slugifyReferralName(profile?.x_handle || profile?.full_name || user?.email?.split('@')[0]);
  const referralLink = `${window.location.origin}/ref/${referralCode}${referrerName ? `/${referrerName}` : ''}`;
  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return referralActivity;
    return referralActivity.filter((ref) => ref.username.toLowerCase().includes(query));
  }, [referralActivity, search]);
  const totalReferralPoints = referralActivity.reduce((sum, ref) => sum + Number(ref.points || 0), 0);
  const eligibleReferrals = referralActivity.filter((ref) => ref.status === 'Qualified').length;

  useEffect(() => {
    const loadReferrals = async () => {
      if (!user || !supabase) return;

      try {
        setLoadingActivity(true);
        if (!profile?.referral_code) {
          await ensureCreatorReferralCode(user.id, profile?.x_handle);
          await refreshProfile();
        }

        const { data, error } = await supabase
          .from('referrals')
          .select(`
            id,
            status,
            points_awarded,
            created_at,
            qualified_at,
            referred_profile:creator_profiles!referrals_referred_id_fkey (
              id,
              x_handle,
              full_name,
              sorsa_score
            )
          `)
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setReferralActivity((data || []).map((ref: any) => {
          const creator = ref.referred_profile;
          return {
            id: ref.id,
            username: creator?.x_handle || creator?.full_name || 'Creator',
            score: Number(creator?.sorsa_score || 0),
            date: new Date(ref.created_at).toLocaleDateString(),
            status: ref.status === 'qualified' ? 'Qualified' : 'Pending',
            points: Number(ref.points_awarded || 0),
          };
        }));
      } catch (error) {
        console.error('Error loading referrals:', error);
      } finally {
        setLoadingActivity(false);
      }
    };

    loadReferrals();
  }, [profile?.referral_code, profile?.x_handle, refreshProfile, user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pointScale = [
    { scoreRange: '0 - 100', points: 10 },
    { scoreRange: '101 - 250', points: 50 },
    { scoreRange: '251 - 500', points: 150 },
    { scoreRange: '501 - 750', points: 300 },
    { scoreRange: '751 - 1000', points: 500 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="glass-panel rounded-[2rem] p-8 md:p-12 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute right-4 top-4 z-20">
              <CreatorTopBar embedded />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">Refer and Earn</h1>
                  <p className="text-muted text-lg leading-relaxed">
                    Invite new creators using your referral link. They'll earn points after completing a campaign, and you'll earn points based on their Sorsa Score.
                  </p>
                </div>

                <button onClick={handleCopy} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy Referral Link'}
                </button>

                <div className="flex gap-4 pt-4">
                  <div className="glass-panel rounded-2xl p-5 border border-white/10 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Star className="w-12 h-12" /></div>
                    <div className="text-3xl font-bold text-cyan mb-1">{totalReferralPoints.toLocaleString()}</div>
                    <div className="text-sm text-muted font-medium">Total Points from Referral</div>
                  </div>
                  <div className="glass-panel rounded-2xl p-5 border border-white/10 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Users className="w-12 h-12" /></div>
                    <div className="text-3xl font-bold text-white mb-1">{eligibleReferrals.toLocaleString()}</div>
                    <div className="text-sm text-muted font-medium">Eligible Referrals</div>
                  </div>
                </div>
              </div>

              <div className="w-64 h-64 shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 to-purple/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="w-32 h-32 text-white/80 drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Check Last 30 Days Referrals</h2>
              <button onClick={() => setShowPointScale(true)} className="text-sm text-cyan hover:underline">
                Point System
              </button>
            </div>
            <div className="relative">
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="Type a username..." className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-16 py-4 text-white focus:outline-none focus:border-cyan/50 transition-colors" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}>
            <h2 className="text-lg font-semibold text-cyan mb-4">Referral Activity</h2>
            <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Username</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Sorsa Score</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Referred on</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingActivity ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted">Loading referral activity...</td>
                      </tr>
                    ) : filteredActivity.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted">Referral activity will appear here after invited creators join and complete campaigns.</td>
                      </tr>
                    ) : filteredActivity.map((ref) => (
                      <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-6 text-white font-medium">{ref.username}</td>
                        <td className="p-6 text-white">{ref.score}</td>
                        <td className="p-6 text-muted">{ref.date}</td>
                        <td className="p-6"><span className={`text-sm font-medium ${ref.status === 'Qualified' ? 'text-green-400' : 'text-yellow-400'}`}>{ref.status}</span></td>
                        <td className="p-6 text-right text-white font-semibold">{ref.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showPointScale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPointScale(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3, ease: appleEase }} className="relative w-full max-w-md glass-panel rounded-[2rem] p-8 border border-white/10 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan/10 blur-[60px] rounded-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-xl font-semibold text-white">Referral Point Scale</h3>
                <button onClick={() => setShowPointScale(false)} className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 relative z-10">
                <p className="text-sm text-muted mb-4">You earn points based on the Sorsa Score of the creators you refer, once they complete their first campaign.</p>
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">Referred User Score</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Points Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pointScale.map((tier) => (
                        <tr key={tier.scoreRange} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-sm text-white font-medium">{tier.scoreRange}</td>
                          <td className="py-3 px-4 text-sm text-cyan font-semibold text-right">+{tier.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
