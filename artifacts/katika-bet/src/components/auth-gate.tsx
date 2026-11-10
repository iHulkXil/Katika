import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { KatikaLogo } from '@/components/katika-logo';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  if (!ready) {
    return <p className="px-3 pt-10 text-center text-sm text-slate-400">Loading...</p>;
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="px-6 pt-16 text-center">
      <div className="mx-auto mb-6 flex justify-center">
        <KatikaLogo className="h-12 w-12" />
      </div>
      <p className="font-mono-custom text-[11px] tracking-[0.2em] text-blue-400">SIDEBET</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {mode === 'signin' ? 'Welcome back' : 'Create account'}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {mode === 'signin'
          ? 'Sign in with Google, email, or wallet to start trading.'
          : 'Create an account to create and trade on prediction markets.'}
      </p>
      <button
        type="button"
        onClick={() => void login()}
        className="mt-8 w-full rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 active:scale-[0.98]"
      >
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-200"
      >
        {mode === 'signin' ? 'No account? Create one' : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
