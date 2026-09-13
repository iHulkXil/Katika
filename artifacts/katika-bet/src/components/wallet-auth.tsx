import { LogOut, WalletCards } from 'lucide-react';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { TestnetWallets } from '@/components/testnet-wallets';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function accountLabel(user: {
  wallet?: { address?: string } | null;
  email?: { address?: string } | null;
  google?: { email?: string } | null;
} | null) {
  if (user?.wallet?.address) return shortenAddress(user.wallet.address);
  if (user?.email?.address) return user.email.address;
  if (user?.google?.email) return user.google.email;
  return 'Signed in';
}

type WalletAuthButtonProps = {
  compact?: boolean;
  className?: string;
};

export function WalletAuthButton({
  compact = false,
  className = '',
}: WalletAuthButtonProps) {
  const { ready, authenticated, user, login } = usePrivy();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <button type="button" disabled className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground opacity-70 ${className}`}>
        <WalletCards size={15} />
        Loading
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-accent px-3 py-2 font-mono-custom text-xs ${compact ? 'hidden sm:inline-flex' : ''}`}>
          {accountLabel(user)}
        </span>
        <button type="button" onClick={() => void logout()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">
          <LogOut size={14} />
          <span className={compact ? 'hidden sm:inline' : ''}>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void login()} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground ${className}`}>
      <WalletCards size={15} />
      Sign in
    </button>
  );
}

export function ConnectedWalletStatus() {
  const { ready, authenticated, user } = usePrivy();
  const { serverUser, loading } = useServerSession();
  const address = user?.wallet?.address;
  const email = user?.email?.address ?? user?.google?.email;
  const ktk = serverUser?.ktk ?? serverUser?.demoCredits ?? 0;

  if (!ready) return <p className="font-mono-custom text-sm text-muted-foreground">Loading account status...</p>;

  if (authenticated) {
    return (
      <div>
        <div className="rounded-xl border border-primary/30 bg-accent/50 p-4">
          <p className="text-xs uppercase tracking-[.18em] text-primary">Signed in</p>
          {email ? <p className="mt-2 text-sm">{email}</p> : null}
          <p className="mt-2 break-all font-mono-custom text-sm">{address ?? 'Embedded wallet ready'}</p>
          <p className="mt-3 font-mono-custom text-lg text-primary">
            {loading && !serverUser ? '...' : `${ktk.toLocaleString()} KTK`}
          </p>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-[#8FA39A]">Chain tools</summary>
          <TestnetWallets />
        </details>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-background/30 p-4">
      <p className="text-sm text-muted-foreground">Sign in to get 1000 KTK.</p>
      <WalletAuthButton className="mt-4" />
    </div>
  );
}
