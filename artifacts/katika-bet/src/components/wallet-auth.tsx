import { LogOut, WalletCards } from 'lucide-react';
import { useLogout, usePrivy } from '@privy-io/react-auth';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type WalletAuthButtonProps = {
  compact?: boolean;
  className?: string;
};

export function WalletAuthButton({
  compact = false,
  className = '',
}: WalletAuthButtonProps) {
  const { ready, authenticated, user, connectWallet } = usePrivy();
  const { logout } = useLogout();
  const address = user?.wallet?.address;

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground opacity-70 ${className}`}
        aria-label="Loading wallet connection"
      >
        <WalletCards size={15} />
        Loading wallet
      </button>
    );
  }

  if (authenticated && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-accent px-3 py-2 font-mono-custom text-xs text-accent-foreground ${
            compact ? 'hidden sm:inline-flex' : ''
          }`}
          aria-label={`Wallet connected: ${address}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          {shortenAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="button-disconnect-wallet"
        >
          <LogOut size={14} />
          <span className={compact ? 'hidden sm:inline' : ''}>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connectWallet()}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      data-testid="button-connect-wallet"
    >
      <WalletCards size={15} />
      Connect Wallet
    </button>
  );
}

export function ConnectedWalletStatus() {
  const { ready, authenticated, user } = usePrivy();
  const address = user?.wallet?.address;

  if (!ready) {
    return <p className="font-mono-custom text-sm text-muted-foreground">Loading wallet status...</p>;
  }

  if (authenticated && address) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent/50 p-4">
        <p className="text-xs uppercase tracking-[.18em] text-primary">Wallet Connected</p>
        <p className="mt-2 break-all font-mono-custom text-sm text-foreground">{address}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-background/30 p-4">
      <p className="text-sm text-muted-foreground">Connect Wallet to access your wallet identity.</p>
      <WalletAuthButton className="mt-4" />
    </div>
  );
}
