import { StrictMode, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
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

const config = getDefaultConfig({
  appName: 'SorsaMarket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3fbb6b34438139a04a5840e4f3261a35',
 // Placeholder, user should update in .env if needed
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(import.meta.env.VITE_ESCROW_RPC_URL),
    [base.id]: http(),
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
