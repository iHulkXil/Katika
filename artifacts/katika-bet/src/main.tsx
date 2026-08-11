import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
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
      <App />
    </PrivyProvider>
  </ErrorBoundary>,
);
