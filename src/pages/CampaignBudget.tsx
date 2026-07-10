import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, X, AlertCircle, Loader2, Info } from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { isAddressEqual } from 'viem';
import BrandConnectWalletButton from '../components/BrandConnectWalletButton';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import { assertEscrowLaunchBackendReady, authorizeEscrowLaunch, getEscrowLaunchErrorMessage, launchCampaignThroughEscrow, saveCampaignDraftThroughBackend } from '../lib/escrowLaunch';

const appleEase = [0.16, 1, 0.3, 1] as const;

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CampaignBudget() {
  const navigate = useNavigate();
  const location = useLocation();
  const campaignData = location.state?.campaignData;
  const initialDraftCampaignId = location.state?.draftCampaignId || null;
  const campaignType = campaignData?.campaign_type || 'general';

  const { refreshCampaigns } = useCampaigns();
  const { session } = useAuth();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const walletClientAddress = walletClient?.account?.address;
  const isWalletSynced = Boolean(
    address &&
    walletClientAddress &&
    isAddressEqual(address, walletClientAddress)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'success'>('idle');
  const [error, setError] = useState('');
  const [draftCampaignId, setDraftCampaignId] = useState<string | null>(initialDraftCampaignId);

  const [budget, setBudget] = useState<string>(
    campaignData?.budget ? String(campaignData.budget) : campaignType === 'kol' ? '1500' : '250'
  );
  const [audience, setAudience] = useState<'everyone' | 'small'>('everyone');
  const [spotlightRequests, setSpotlightRequests] = useState<string[]>(['']);
  const [showSpotlightTooltip, setShowSpotlightTooltip] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [startDate, setStartDate] = useState(campaignData?.start_date ? String(campaignData.start_date).slice(0, 10) : '');
  const [endDate, setEndDate] = useState(campaignData?.end_date ? String(campaignData.end_date).slice(0, 10) : '');

  const numBudget = parseFloat(budget) || 0;
  const platformFee = numBudget * 0.15;
  const netBudget = numBudget - platformFee;

  const minBudget = campaignType === 'kol' ? 1500 : 250;
  const isBudgetValid = numBudget >= minBudget;
  const todayDate = getLocalDateInputValue();
  const minEndDate = startDate && startDate > todayDate ? startDate : todayDate;

  useEffect(() => {
    if (!campaignData) {
      // Redirect if no data from step 1
      navigate('/brand/campaigns/new');
    }
  }, [campaignData, navigate]);

  useEffect(() => {
    if (numBudget > 500 || campaignType === 'kol') {
      setAudience('everyone');
    }
  }, [numBudget, campaignType]);

  const handleAddRequest = () => {
    setSpotlightRequests([...spotlightRequests, '']);
  };

  const handleRequestChange = (index: number, value: string) => {
    const newReqs = [...spotlightRequests];
    newReqs[index] = value;
    setSpotlightRequests(newReqs);
  };

  const handleRemoveRequest = (index: number) => {
    const newReqs = spotlightRequests.filter((_, i) => i !== index);
    setSpotlightRequests(newReqs.length ? newReqs : ['']);
  };

  const handleStartDateChange = (value: string) => {
    if (value && value < todayDate) {
      setStartDate('');
      setError('Choose today or a future date for the campaign start date.');
      return;
    }
    setStartDate(value);
    setError('');
  };

  const handleEndDateChange = (value: string) => {
    if (value && value < minEndDate) {
      setEndDate('');
      setError('Choose an end date that is not before the campaign start date.');
      return;
    }
    setEndDate(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBudgetValid || !agreed || !isConnected || !isWalletSynced) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (!startDate || startDate < todayDate) {
        throw new Error('Choose today or a future date for the campaign start date.');
      }
      if (!endDate || endDate < minEndDate) {
        throw new Error('Choose an end date that is not before the campaign start date.');
      }

      if (!address || !walletClient || !publicClient) {
        throw new Error('Connect the brand wallet before launching the campaign.');
      }

      setTxState('pending');
      await assertEscrowLaunchBackendReady();

      // Combine spotlight requests into overview to not lose data if schema doesn't support it directly
      const validRequests = spotlightRequests.filter(r => r.trim() !== '');
      let finalOverview = campaignData.overview;
      if (validRequests.length > 0) {
        finalOverview += `\n\nSpotlight Requests:\n- ${validRequests.join('\n- ')}`;
      }

      const payload = {
        ...campaignData,
        overview: finalOverview,
        budget: numBudget,
        net_budget: netBudget,
        platform_fee: platformFee,
        start_date: startDate || null,
        end_date: endDate || null
      };

      // Fix: rename brand_id -> brand_profile_id if needed (handles old cached state)
      if (payload.brand_id && !payload.brand_profile_id) {
        payload.brand_profile_id = payload.brand_id;
        delete payload.brand_id;
      }
      // Also remove any stale brand_id key even if brand_profile_id exists
      if (payload.brand_id) {
        delete payload.brand_id;
      }

      const savedDraft = await saveCampaignDraftThroughBackend(
        payload,
        session?.access_token,
        draftCampaignId
      );
      setDraftCampaignId(savedDraft.campaignId);

      const authorization = await authorizeEscrowLaunch({
        campaign: payload,
        brandWallet: address,
        walletClient,
        publicClient
      });

      const confirmedLaunch = await launchCampaignThroughEscrow(
        {
          campaign: payload,
          brandWallet: address,
          draftCampaignId: savedDraft.campaignId,
          authorization
        },
        session?.access_token
      );

      setTxState('success');
      await refreshCampaigns();
      navigate(`/brand/campaigns/${confirmedLaunch.campaignId}`);
    } catch (err: any) {
      console.error('Escrow launch failed:', err);
      setError(getEscrowLaunchErrorMessage(err));
      setTxState('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />

      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center gap-4 mb-8">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              onClick={() => navigate('/brand/campaigns/new')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-cyan text-sm font-semibold tracking-wider uppercase mb-1"
              >
                Step 2 of 2 — Budget & Launch
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                Budget & Launch
              </motion.h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="glass-panel rounded-[2rem] p-8 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>

            <form className="relative z-10 space-y-8" onSubmit={handleSubmit}>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Budget Section */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Campaign Budget (USDC)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-white/50 font-medium">USDC</span>
                    </div>
                    <input
                      type="number"
                      min={minBudget}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className={`w-full pl-16 pr-4 py-4 rounded-xl bg-black/50 border text-xl font-semibold text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${
                        !isBudgetValid && budget !== '' ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-cyan focus:ring-cyan'
                      }`}
                    />
                  </div>
                  {!isBudgetValid && budget !== '' && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Minimum budget is {minBudget} USDC
                    </p>
                  )}
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Platform Fee (15%)</span>
                    <span>{platformFee.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-white pt-4 border-t border-white/10">
                    <span>Net Budget for Creators</span>
                    <span className="text-cyan">{netBudget.toFixed(2)} USDC</span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-muted leading-relaxed">
                      <span className="text-cyan font-medium">Dynamic Reward Allocation:</span> Sorsa's algorithm automatically determines base rewards and performance multipliers based on each creator's Sorsa Score.
                    </p>
                  </div>
                </div>
              </div>

              {/* Audience Toggle (Conditional) */}
              {campaignType === 'general' && numBudget >= 250 && numBudget <= 500 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">Audience Targeting</label>
                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAudience('small')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        audience === 'small' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                      }`}
                    >
                      Small Creators Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudience('everyone')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        audience === 'everyone' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                      }`}
                    >
                      Open to Everyone
                    </button>
                  </div>
                  {audience === 'small' && (
                    <p className="text-xs text-cyan mt-2">
                      Sorsa score threshold for this campaign will be set from 50 to 200.
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Start Date</label>
                  <input
                    type="date"
                    required
                    min={todayDate}
                    value={startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">End Date</label>
                  <input
                    type="date"
                    required
                    min={minEndDate}
                    value={endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Spotlight Requests */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-white">Spotlight Requests</label>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Spotlight requests info"
                        aria-expanded={showSpotlightTooltip}
                        onClick={() => setShowSpotlightTooltip((value) => !value)}
                        onMouseEnter={() => setShowSpotlightTooltip(true)}
                        onMouseLeave={() => setShowSpotlightTooltip(false)}
                        onFocus={() => setShowSpotlightTooltip(true)}
                        onBlur={() => setShowSpotlightTooltip(false)}
                        className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-muted hover:text-cyan hover:border-cyan/40 flex items-center justify-center transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      {showSpotlightTooltip && (
                        <div className="absolute left-1/2 top-7 z-20 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#121229] px-3 py-2 text-xs leading-relaxed text-white shadow-2xl">
                          Share a request, guideline, or reminder you want creators to follow
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRequest}
                    className="text-xs font-medium text-cyan hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Request
                  </button>
                </div>
                <div className="space-y-3">
                  {spotlightRequests.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => handleRequestChange(index, e.target.value)}
                        placeholder="e.g. Mention @AtlasReach"
                        className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRequest(index)}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms & Submit */}
              <div className="pt-6 border-t border-white/10 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-muted space-y-4 max-h-64 overflow-y-auto">
                  <h3 className="text-white font-semibold text-base mb-2">Smart Contract & Escrow Guidelines</h3>

                  <h4 className="text-white font-medium mt-4">1. Automated Fee Deduction</h4>
                  <p>Upon launching a campaign, our smart contract automatically deducts the 15% platform fee from your total budget. The remaining net budget is immediately locked in a secure escrow smart contract.</p>

                  <h4 className="text-white font-medium mt-4">2. Escrow Release Schedule</h4>
                  <p>Funds locked in escrow are automatically released to participating creators exactly 1 day after the campaign's end date. This provides a 24-hour window for dispute resolution if any fraudulent activity is detected.</p>

                  <h4 className="text-white font-medium mt-4">3. Immutable Campaign Parameters</h4>
                  <p>After a campaign becomes active on the blockchain, its configuration and budget are considered final. Projects cannot edit, pause, or terminate an ongoing campaign. Allocated campaign budgets are treated as committed and are not eligible for refunds.</p>

                  <h4 className="text-white font-medium mt-4">4. Wallet Interaction</h4>
                  <p>You must connect a Web3 wallet to authorize the funding transaction. AtlasReach never has direct access to your wallet's private keys. The transaction will prompt your wallet extension to approve the USDC transfer to the escrow contract.</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      required
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer appearance-none w-5 h-5 rounded-full border border-white/20 bg-transparent checked:bg-cyan checked:border-cyan transition-colors duration-200"
                    />
                    <svg className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-muted group-hover:text-white/80 transition-colors">
                    I have read and agree to the Smart Contract & Escrow Guidelines, and understand that funds will be locked in escrow.
                  </span>
                </label>

                <div className="flex flex-col items-end gap-3">
                  {!isConnected ? (
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm text-cyan mb-2 font-medium">Connect wallet to authorize payment</p>
                      <BrandConnectWalletButton />
                    </div>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={!isBudgetValid || !agreed || isSubmitting || !isWalletSynced}
                        className="px-10 py-4 rounded-full bg-cyan text-black font-semibold hover:scale-[1.02] transition-all duration-300 shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center gap-2"
                      >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {!isWalletSynced ? 'Syncing Wallet...' :
                         txState === 'idle' ? 'Fund & Launch Campaign' :
                         txState === 'pending' ? 'Confirming Escrow...' :
                         'Success! Redirecting...'}
                      </button>
                      <p className="text-xs text-muted">
                        {!isWalletSynced
                          ? 'Wallet changed. Waiting for the connected wallet to finish syncing.'
                          : 'Payment is made in USDC via smart contract. Campaign goes live immediately upon confirmation.'}
                      </p>
                    </>
                  )}
                </div>
              </div>

            </form>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
