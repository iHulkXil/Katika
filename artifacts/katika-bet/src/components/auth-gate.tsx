import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  if (!ready) {
    return <p className="px-3 pt-10 text-center text-sm text-[#8FA39A]">Loading...</p>;
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="px-4 pt-10">
      <p className="text-center font-mono-custom text-[10px] tracking-[0.22em] text-[#35D399]">KATIKA.BET</p>
      <h1 className="mt-3 text-center text-3xl font-semibold">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="mt-2 text-center text-sm text-[#8FA39A]">
        {mode === 'signin'
          ? 'Use Google or email. $KTK is credited on first session.'
          : 'New account gets 1000 $KTK on the house ledger.'}
      </p>
      <button
        type="button"
        onClick={() => void login()}
        className="mt-6 w-full rounded-full bg-[#35D399] py-3.5 text-sm font-semibold text-[#062018]"
      >
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 w-full text-center text-sm text-[#8FA39A]"
      >
        {mode === 'signin' ? 'No account? Create one' : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
