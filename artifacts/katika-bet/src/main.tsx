import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServerSessionSync } from '@/components/server-session';
import { base, mainnet, arbitrum, polygon } from '@/lib/mainnet-chains';

import './index.css';
import './game-motion.css';

// Privy App ID with standard production fallback
const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID ?? 'cmske7xuh00750djms91aexl3').trim();

// Solana Cluster & RPC configuration (defaults to mainnet-beta; configurable via env)
export const SOLANA_CLUSTER_NAME = (import.meta.env.VITE_SOLANA_CLUSTER ?? 'mainnet-beta') as 'mainnet-beta' | 'devnet';
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC ?? (
  SOLANA_CLUSTER_NAME === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com'
);
export const SOLANA_CAIP_CHAIN = (
  SOLANA_CLUSTER_NAME === 'devnet' ? 'solana:devnet' : 'solana:mainnet'
) as 'solana:devnet' | 'solana:mainnet';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#22C55E',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-and-solana',
        },
        defaultChain: base,
        supportedChains: [base, mainnet, arbitrum, polygon],
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
          solana: { createOnLogin: 'all-users' },
        },
        solanaClusters: [
          {
            name: SOLANA_CLUSTER_NAME,
            rpcUrl: SOLANA_RPC_URL,
          },
        ],
      }}
    >
      <ServerSessionSync>
        <App />
      </ServerSessionSync>
    </PrivyProvider>
  </ErrorBoundary>,
);
