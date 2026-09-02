import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServerSessionSync } from '@/components/server-session';

import './index.css';

const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID ?? '').trim();

function MissingPrivyConfig() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-5 text-foreground">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8">
        <p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">
          WALLET / CONFIG
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-.04em]">
          Privy App ID is missing
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Set <code className="text-foreground">PRIVY_APP_ID</code> or{' '}
          <code className="text-foreground">VITE_PRIVY_APP_ID</code> and restart
          the app. Do not put the App Secret in the client.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    {privyAppId ? (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#35d399',
            showWalletLoginFirst: true,
          },
        }}
      >
        <ServerSessionSync />
        <App />
      </PrivyProvider>
    ) : (
      <MissingPrivyConfig />
    )}
  </ErrorBoundary>,
);
