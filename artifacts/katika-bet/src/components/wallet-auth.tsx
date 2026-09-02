import { LogOut, WalletCards } from 'lucide-react';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';

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
  const { serverUser } = useServerSession();
  const address = user?.wallet?.address;

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground opacity-70 ${className}`}
        aria-label="Loading sign in"
      >
        <WalletCards size={15} />
        Loading
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {typeof serverUser?.demoCredits === 'number' ? (
          <span
            className={`rounded-lg border border-secondary/40 bg-card px-3 py-2 font-mono-custom text-xs text-foreground ${compact ? 'hidden sm:inline' : ''}`}
            data-testid="status-demo-credits-chip"
          >
            {serverUser.demoCredits} demo
          </span>
        ) : null}
        <span
          className={`inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-accent px-3 py-2 font-mono-custom text-xs text-accent-foreground ${
            compact ? 'hidden sm:inline-flex' : ''
          }`}
          aria-label={address ? `Wallet connected: ${address}` : 'Signed in'}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          {accountLabel(user)}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="button-disconnect-wallet"
        >
          <LogOut size={14} />
          <span className={compact ? 'hidden sm:inline' : ''}>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void login()}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      data-testid="button-connect-wallet"
    >
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

  if (!ready) {
    return <p className="font-mono-custom text-sm text-muted-foreground">Loading account status...</p>;
  }

  if (authenticated) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent/50 p-4">
        <p className="text-xs uppercase tracking-[.18em] text-primary">Signed in</p>
        {email ? <p className="mt-2 text-sm text-foreground">{email}</p> : null}
        <p className="mt-2 break-all font-mono-custom text-sm text-foreground">
          {address ?? 'Allocating embedded wallet...'}
        </p>
        <p className="mt-3 font-mono-custom text-sm text-foreground" data-testid="status-demo-credits">
          {loading && !serverUser
            ? 'Loading demo credits...'
            : `Demo credits: ${serverUser?.demoCredits ?? '—'}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Not real money. No cash-out.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-background/30 p-4">
      <p className="text-sm text-muted-foreground">Sign in with email, Google, or a wallet.</p>
      <WalletAuthButton className="mt-4" />
    </div>
  );
}
