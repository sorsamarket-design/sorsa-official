import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LogOut, Wallet } from 'lucide-react';
import { useDisconnect } from 'wagmi';

function shortAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function BrandConnectWalletButton() {
  const { disconnectAsync, isPending } = useDisconnect();

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }: any) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="px-5 py-3 rounded-full bg-white text-black font-semibold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
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
                className="px-5 py-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors"
              >
                Wrong Network
              </button>
              <button
                type="button"
                onClick={() => disconnectAsync()}
                disabled={isPending}
                className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
              className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Wallet className="w-4 h-4 text-cyan" />
              {account.displayName || shortAddress(account.address)}
            </button>
            <button
              type="button"
              onClick={() => disconnectAsync()}
              disabled={isPending}
              className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
