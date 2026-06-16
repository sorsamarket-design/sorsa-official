import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getAddress, isAddress } from 'viem';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Info, X } from 'lucide-react';

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
    if (!isAddress(normalizedWallet)) {
      setWalletError('Enter a valid wallet address.');
      return;
    }
    setShowWarningPopup(true);
  };

  const bindToDatabase = async () => {
    if (!user || !supabase || !isAddress(normalizedWallet) || profile?.wallet_address) return;

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
        <input
          value={walletInput}
          onChange={(event) => {
            setWalletInput(event.target.value);
            setWalletError('');
          }}
          placeholder="0x..."
          disabled={isBinding}
          className="w-full max-w-[320px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder:text-muted focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all disabled:opacity-50"
        />
        {walletError && <p className="text-[10px] text-red-400 text-center max-w-[240px]">{walletError}</p>}
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A1E] border border-white/10 p-6 rounded-2xl max-w-sm w-full relative shadow-2xl">
            <button
              onClick={() => setShowWarningPopup(false)}
              className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-cyan/10 flex items-center justify-center mb-4">
                <Info className="w-6 h-6 text-cyan" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Permanent Binding</h3>
              <p className="text-sm text-muted mb-6">
                You will not be able to disconnect or change this wallet once bound
              </p>

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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
