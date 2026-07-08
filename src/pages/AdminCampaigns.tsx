import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Megaphone, Clock, CheckCircle2, AlertCircle, Loader2, Sparkles, DollarSign } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { useCampaigns, Campaign } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function AdminCampaigns() {
  const { campaigns, finalizeCampaign, runPayoutAutomation, refreshCampaigns } = useCampaigns();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [automationMessage, setAutomationMessage] = useState('');
  const [automationError, setAutomationError] = useState(false);

  const isExpiredCampaign = (campaign: Campaign) => Boolean(campaign.end_date && new Date(campaign.end_date) < new Date());
  const needsFinalizationCampaigns = campaigns.filter(c => c.status === 'live' && isExpiredCampaign(c));
  const activeCampaigns = campaigns.filter(c => c.status === 'live' && !isExpiredCampaign(c));
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  const handleFinalize = async (id: string) => {
    if (!confirm('Are you sure you want to finalize this campaign? This will fetch Sorsa metrics and award rewards to all approved participants.')) return;
    
    setIsProcessing(id);
    try {
      await finalizeCampaign(id);
      await refreshCampaigns();
      alert('Campaign finalized successfully!');
    } catch (err) {
      console.error('Error finalizing campaign:', err);
      alert('Failed to finalize campaign');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRunAutomation = async () => {
    if (!confirm('Run payout automation for all ended live campaigns now?')) return;

    setIsRunningAutomation(true);
    setAutomationMessage('');
    setAutomationError(false);
    try {
      const result = await runPayoutAutomation();
      await refreshCampaigns();
      setAutomationMessage(`Checked ${result.checked || 0}. Prepared ${result.prepared || 0}, distributed ${result.distributed || 0}, skipped ${result.skipped || 0}, failed ${result.failed || 0}.`);
    } catch (err: any) {
      console.error('Error running payout automation:', err);
      setAutomationError(true);
      setAutomationMessage(err.message || 'Payout automation failed.');
    } finally {
      setIsRunningAutomation(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="admin-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="text-3xl font-semibold tracking-tight text-white"
            >
              Campaign Management
            </motion.h1>
            <button
              onClick={handleRunAutomation}
              disabled={isRunningAutomation || needsFinalizationCampaigns.length === 0}
              className="px-5 py-3 rounded-xl bg-cyan text-black font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
            >
              {isRunningAutomation ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {isRunningAutomation ? 'Running...' : 'Run Payout Automation'}
            </button>
          </div>
          {automationMessage && (
            <div className={`mb-8 p-4 rounded-xl border text-sm ${automationError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan/10 border-cyan/20 text-cyan'}`}>
              {automationMessage}
            </div>
          )}

          {/* Needs Finalization */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" /> Needs Finalization
              {needsFinalizationCampaigns.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                  {needsFinalizationCampaigns.length}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {needsFinalizationCampaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-[2rem] p-6 border border-yellow-500/20 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={campaign.brand_profile?.logo_url}
                        alt={campaign.brand_profile?.company_name}
                        className="w-12 h-12 rounded-xl object-cover bg-white/5"
                      />
                      <div>
                        <h3 className="font-semibold text-white">{campaign.title}</h3>
                        <p className="text-xs text-muted">{campaign.brand_profile?.company_name}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wider border border-yellow-500/20">
                      Ended
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Budget</span>
                      <span className="text-white font-medium">${campaign.budget}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Ended</span>
                      <span className="text-yellow-400 font-medium">
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFinalize(campaign.id)}
                    disabled={!!isProcessing}
                    className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-cyan text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(0,212,255,0.2)] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isProcessing === campaign.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Finalize & Payout <Sparkles className="w-4 h-4" /></>
                    )}
                  </button>
                </motion.div>
              ))}
              {needsFinalizationCampaigns.length === 0 && (
                <div className="col-span-full p-12 text-center glass-panel rounded-[2rem] border border-dashed border-white/10">
                  <p className="text-muted">No ended campaigns waiting for finalization.</p>
                </div>
              )}
            </div>
          </section>

          {/* Active Campaigns */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-cyan" /> Live Campaigns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCampaigns.map((campaign) => {
                return (
                  <motion.div 
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-[2rem] p-6 border border-white/10 relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={campaign.brand_profile?.logo_url} 
                          alt={campaign.brand_profile?.company_name} 
                          className="w-12 h-12 rounded-xl object-cover bg-white/5"
                        />
                        <div>
                          <h3 className="font-semibold text-white">{campaign.title}</h3>
                          <p className="text-xs text-muted">{campaign.brand_profile?.company_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Budget</span>
                        <span className="text-white font-medium">${campaign.budget}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">End Date</span>
                        <span className="text-white">
                          {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleFinalize(campaign.id)}
                      disabled
                      className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-white/5 text-muted cursor-not-allowed"
                    >
                      {isProcessing === campaign.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>Finalize & Payout <Sparkles className="w-4 h-4" /></>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-muted mt-2">Finalization available after end date</p>
                  </motion.div>
                );
              })}
              {activeCampaigns.length === 0 && (
                <div className="col-span-full p-12 text-center glass-panel rounded-[2rem] border border-dashed border-white/10">
                  <p className="text-muted">No live campaigns found.</p>
                </div>
              )}
            </div>
          </section>

          {/* Completed Campaigns */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" /> Completed
            </h2>
            <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Campaign</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Completed Date</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {completedCampaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <p className="text-white font-medium">{c.title}</p>
                          <p className="text-xs text-muted">{c.brand_profile?.company_name}</p>
                        </td>
                        <td className="p-6 text-muted text-sm">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-white font-semibold">${c.budget}</span>
                        </td>
                      </tr>
                    ))}
                    {completedCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-muted">No completed campaigns yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
