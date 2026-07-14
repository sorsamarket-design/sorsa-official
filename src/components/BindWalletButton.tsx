import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { getAddress, isAddress } from 'viem';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Info, X } from 'lucide-react';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function BindWalletButton() {
  const { profile, loading: profileLoading, refreshProfile } = useCreatorProfile();
  const { user } = useAuth();
  const [isBinding, setIsBinding] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [walletError, setWalletError] = useState('');

  const normalizedWallet = walletInput.trim();

  const handleStartBinding = () => {
    setWalletError('');
    setShowWarningPopup(true);
  };

  const bindToDatabase = async () => {
    if (!user || !supabase || profile?.wallet_address) return;
    if (!isAddress(normalizedWallet)) {
      setWalletError('Enter a valid wallet address.');
      return;
    }

    setIsBinding(true);
    setWalletError('');
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .update({ wallet_address: getAddress(normalizedWallet) })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setWalletInput('');
      setShowWarningPopup(false);
    } catch (error) {
      console.error("Error binding wallet:", error);
      setWalletError('Wallet could not be bound.');
    } finally {
      setIsBinding(false);
    }
  };

  // Loading state while checking DB
  if (profileLoading) {
    return <div className="h-10 w-32 bg-white/5 animate-pulse rounded-xl border border-white/10" />;
  }

  // If wallet is bound in DB, show permanent UI.
  if (profile?.wallet_address) {
    const boundAddress = profile.wallet_address;
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-default shadow-[0_0_15px_rgba(0,212,255,0.05)]">
        <div className="w-5 h-5 rounded-full bg-cyan/20 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,212,255,0.8)]"></div>
        </div>
        <span className="text-white font-medium text-sm font-mono">
          {boundAddress.slice(0, 6)}...{boundAddress.slice(-4)}
        </span>
      </div>
    );
  }

  // Otherwise, show the manual bind UI.
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleStartBinding}
          disabled={isBinding}
          className="px-6 py-2.5 bg-cyan text-black font-semibold rounded-xl hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-60 disabled:hover:scale-100"
          type="button"
        >
          {isBinding ? "Binding..." : "Bind Wallet"}
        </button>
        <p className="text-[10px] text-muted text-center max-w-[200px]">
          Warning: Wallet cannot be disconnected once bound
        </p>
      </div>

      {/* Warning Popup Modal */}
      {showWarningPopup && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWarningPopup(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3, ease: appleEase }} className="relative w-full max-w-sm glass-panel rounded-[2rem] p-8 border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan/10 blur-[60px] rounded-full pointer-events-none"></div>
            <button
              onClick={() => setShowWarningPopup(false)}
              className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-cyan/10 flex items-center justify-center mb-4">
                <Info className="w-6 h-6 text-cyan" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Permanent Binding</h3>
              <p className="text-sm text-muted mb-6">
                You will not be able to disconnect or change this wallet once bound
              </p>

              <div className="w-full mb-4">
                <input
                  value={walletInput}
                  onChange={(event) => {
                    setWalletInput(event.target.value);
                    setWalletError('');
                  }}
                  placeholder="0x..."
                  disabled={isBinding}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder:text-muted focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all disabled:opacity-50"
                />
                {walletError && <p className="mt-2 text-xs text-red-400 text-center">{walletError}</p>}
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowWarningPopup(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={bindToDatabase}
                  disabled={isBinding}
                  className="flex-1 py-3 px-4 rounded-xl bg-cyan text-black font-bold hover:bg-cyan/90 transition-colors shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-60"
                >
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}
