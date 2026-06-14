import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LogOut, Wallet } from 'lucide-react';
import { useDisconnect } from 'wagmi';

function shortAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type BrandConnectWalletButtonProps = {
  compactMobile?: boolean;
};

export default function BrandConnectWalletButton({ compactMobile = false }: BrandConnectWalletButtonProps) {
  const { disconnectAsync, isPending } = useDisconnect();
  const compactButtonClass = compactMobile
    ? 'px-3.5 py-2 text-[0.78rem] md:px-5 md:py-3 md:text-base'
    : 'px-5 py-3';
  const compactIconButtonClass = compactMobile
    ? 'p-2 md:p-3'
    : 'p-3';
  const compactAccountButtonClass = compactMobile
    ? 'min-w-0 max-w-[7.5rem] md:max-w-none'
    : '';

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }: any) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={`${compactButtonClass} rounded-full bg-white text-black font-semibold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]`}
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openChainModal}
                className={`${compactButtonClass} rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors`}
              >
                Wrong Network
              </button>
              <button
                type="button"
                onClick={() => disconnectAsync()}
                disabled={isPending}
                className={`${compactIconButtonClass} rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50`}
                aria-label="Disconnect wallet"
                title="Disconnect wallet"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAccountModal}
              className={`${compactButtonClass} ${compactAccountButtonClass} rounded-full bg-white/5 border border-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition-colors`}
            >
              <Wallet className="w-4 h-4 shrink-0 text-cyan" />
              <span className="truncate">{account.displayName || shortAddress(account.address)}</span>
            </button>
            <button
              type="button"
              onClick={() => disconnectAsync()}
              disabled={isPending}
              className={`${compactIconButtonClass} rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50`}
              aria-label="Disconnect wallet"
              title="Disconnect wallet"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
