import { StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { CreatorProfileProvider } from './hooks/useCreatorProfile';
import { BrandProfilesProvider } from './hooks/useBrandProfiles';
import { TelegramPreferencesProvider } from './hooks/useTelegramPreferences';
import { supabase } from './lib/supabase';
import './index.css';

type WagmiProviderConfig = ComponentProps<typeof WagmiProvider>['config'];

function markInAppBrowser() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return;

  const currentWindow = window as typeof window & {
    Telegram?: unknown;
    TelegramWebview?: unknown;
    TelegramWebviewProxy?: unknown;
    TelegramWebviewProxyProto?: unknown;
    TelegramWebviewProxyReceive?: unknown;
  };
  const ua = navigator.userAgent || '';
  const referrer = document.referrer || '';
  const params = new URLSearchParams(window.location.search);
  const hasTelegramBridge = Boolean(
    currentWindow.Telegram ||
    currentWindow.TelegramWebview ||
    currentWindow.TelegramWebviewProxy ||
    currentWindow.TelegramWebviewProxyProto ||
    currentWindow.TelegramWebviewProxyReceive
  );
  const hasTelegramReferrer = /(^|\/\/)(t\.me|telegram\.me|telegram\.org)\//i.test(referrer) ||
    /^android-app:\/\/org\.telegram\./i.test(referrer);
  const isKnownInAppBrowser = /Telegram|Twitter|Instagram|FBAN|FBAV|Line\/|MicroMessenger|TikTok|Snapchat|LinkedInApp/i.test(ua);
  const isLikelyAndroidWebView = /; wv\)|Version\/[\d.]+.*Chrome\/.*Mobile Safari/i.test(ua);
  const isLikelyIosWebView = /iP(hone|od|ad)/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const forcedInAppBrowser = /^(1|true|telegram|x|twitter|instagram)$/i.test(params.get('in_app_browser') || '');
  const isInAppBrowser = Boolean(
    isKnownInAppBrowser ||
    hasTelegramBridge ||
    hasTelegramReferrer ||
    isLikelyAndroidWebView ||
    isLikelyIosWebView ||
    forcedInAppBrowser
  );
  document.documentElement.classList.toggle('is-in-app-browser', isInAppBrowser);
}

markInAppBrowser();

const config = getDefaultConfig({
  appName: 'AtlasReach',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3fbb6b34438139a04a5840e4f3261a35',
 // Placeholder, user should update in .env if needed
  // Mainnet only - the escrow contract, USDC address, and VITE_ESCROW_CHAIN_ID
  // (8453) are all Base mainnet, so there's no testnet to fall back to.
  chains: [base],
  transports: {
    [base.id]: http(import.meta.env.VITE_ESCROW_RPC_URL),
  } as any,
}) as unknown as WagmiProviderConfig;

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <AuthProvider>
            <BrandProfilesProvider>
              <CreatorProfileProvider>
                <TelegramPreferencesProvider>
                  <App />
                </TelegramPreferencesProvider>
              </CreatorProfileProvider>
            </BrandProfilesProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
