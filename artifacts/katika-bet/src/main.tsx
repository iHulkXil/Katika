import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServerSessionSync } from '@/components/server-session';
import { base, mainnet, arbitrum, polygon } from '@/lib/mainnet-chains';

import './index.css';
import './game-motion.css';

const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID ?? '').trim();

function MissingPrivyConfig() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-5 text-foreground">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8">
        <p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">WALLET / CONFIG</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-.04em]">Privy App ID is missing</h1>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {privyAppId ? (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email', 'google', 'wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#10B981',
            showWalletLoginFirst: true,
            walletChainType: 'ethereum-and-solana',
          },
          defaultChain: base,
          supportedChains: [base, mainnet, arbitrum, polygon],
          embeddedWallets: {
            ethereum: { createOnLogin: 'users-without-wallets' },
            solana: { createOnLogin: 'users-without-wallets' },
          },
          solanaClusters: [
            {
              name: 'mainnet-beta',
              rpcUrl: 'https://api.mainnet-beta.solana.com',
            },
          ],
        }}
      >
        <ServerSessionSync>
          <App />
        </ServerSessionSync>
      </PrivyProvider>
    ) : (
      <MissingPrivyConfig />
    )}
  </ErrorBoundary>,
);
