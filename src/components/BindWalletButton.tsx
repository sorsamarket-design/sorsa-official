import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, X } from 'lucide-react';

export default function BindWalletButton() {
  const { profile, loading: profileLoading, refreshProfile } = useCreatorProfile();
  const { user } = useAuth();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [isBinding, setIsBinding] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);

  // 1. If DB wallet is NULL but Wagmi is connected on mount, it's a leftover session.
  // We must disconnect it to force the user to explicitly "Bind Wallet" again for this new account.
  useEffect(() => {
    if (!profileLoading && !profile?.wallet_address && isConnected && !isBinding) {
      console.log("Leftover wagmi session detected for new account. Disconnecting...");
      disconnect();
    }
  }, [profileLoading, profile?.wallet_address, isConnected, disconnect, isBinding]);

  // 2. If user is explicitly binding and Wagmi successfully connects, save it!
  useEffect(() => {
    async function bindToDatabase() {
      if (isBinding && isConnected && address && user && !profile?.wallet_address) {
        try {
          await supabase.from('creator_profiles').update({ wallet_address: address }).eq('id', user.id);
          await refreshProfile(); // reload the profile to show the permanent address
          setIsBinding(false);
        } catch (error) {
          console.error("Error binding wallet:", error);
        }
      }
    }
    bindToDatabase();
  }, [isBinding, isConnected, address, user, profile, refreshProfile]);

  // Loading state while checking DB
  if (profileLoading) {
    return <div className="h-10 w-32 bg-white/5 animate-pulse rounded-xl border border-white/10" />;
  }

  // 3. If wallet is bound in DB, show permanent UI. Ignore Wagmi state entirely.
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

  // 4. Otherwise, show the bind button UI
  return (
    <>
      <ConnectButton.Custom>
        {({ chain, openChainModal, openConnectModal, mounted }) => {
          const ready = mounted;
          return (
            <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}>
              {(() => {
                if (chain?.unsupported) {
                  return (
                    <button 
                      onClick={openChainModal} 
                      type="button" 
                      className="px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={() => setShowWarningPopup(true)}
                      className="px-6 py-2.5 bg-cyan text-black font-semibold rounded-xl hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                      type="button"
                    >
                      {isBinding ? "Binding..." : "Bind Wallet"}
                    </button>
                    <p className="text-[10px] text-muted text-center max-w-[200px]">
                      Warning: Wallet cannot be disconnected once bound
                    </p>
                  </div>
                );
              })()}

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
                      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
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
                          onClick={() => {
                            setShowWarningPopup(false);
                            setIsBinding(true);
                            openConnectModal();
                          }}
                          className="flex-1 py-3 px-4 rounded-xl bg-cyan text-black font-bold hover:bg-cyan/90 transition-colors shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                        >
                          I Understand
                        </button>
                      </div>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </>
  );
}
