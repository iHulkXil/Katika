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
      <button type="button" disabled className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-xs font-medium text-slate-400 opacity-70 ${className}`}>
        <WalletCards size={14} />
        Loading...
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-blue-400 ${compact ? 'hidden sm:inline-flex' : ''}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {accountLabel(user)}
        </span>
        <button type="button" onClick={() => void logout()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut size={13} />
          <span className={compact ? 'hidden sm:inline' : ''}>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void login()} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all ${className}`}>
      <WalletCards size={14} />
      Connect Wallet
    </button>
  );
}

export function ConnectedWalletStatus() {
  const { ready, authenticated, user } = usePrivy();
  const { serverUser, loading } = useServerSession();
  const address = user?.wallet?.address;
  const email = user?.email?.address ?? user?.google?.email;

  if (!ready) return <p className="font-mono-custom text-sm text-muted-foreground">Loading account status...</p>;

  if (authenticated) {
    return (
      <div>
        <div className="rounded-xl border border-primary/30 bg-accent/50 p-4">
          <p className="text-xs uppercase tracking-[.18em] text-primary">Signed in</p>
          {email ? <p className="mt-2 text-sm">{email}</p> : null}
          <p className="mt-2 break-all font-mono-custom text-sm">{address ?? 'Embedded wallet ready'}</p>
          <p className="mt-3 text-sm text-muted-foreground">EVM / Solana / BTC wallet connected. Internal ledger stays in the background.</p>
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
      <p className="text-sm text-muted-foreground">Connect your EVM, Solana, or Bitcoin wallet for real play.</p>
      <WalletAuthButton className="mt-4" />
    </div>
  );
}
