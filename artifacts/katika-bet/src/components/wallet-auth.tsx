import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useLogout, usePrivy, useWallets as useEvmWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { TestnetWallets } from '@/components/testnet-wallets';

function accountLabel(user: {
  email?: { address?: string } | null;
  google?: { email?: string; name?: string | null } | null;
} | null) {
  if (user?.google?.name) return user.google.name;
  if (user?.email?.address) return user.email.address;
  if (user?.google?.email) return user.google.email;
  return 'Signed in';
}

type WalletAuthButtonProps = {
  compact?: boolean;
  hideAddress?: boolean;
  className?: string;
};

export function WalletAuthButton({
  compact = false,
  hideAddress = false,
  className = '',
}: WalletAuthButtonProps) {
  const { ready, authenticated, user, login } = usePrivy();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-xs font-medium text-slate-400 opacity-70 ${className}`}
      >
        <LogIn size={14} />
        Loading...
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!hideAddress && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-300 ${compact ? 'hidden sm:inline-flex' : ''}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {accountLabel(user)}
          </span>
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={13} />
          <span className={compact ? 'hidden sm:inline' : ''}>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void login()}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 active:scale-95 transition-all whitespace-nowrap shrink-0 ${className}`}
    >
      <LogIn size={14} />
      <span>Sign in</span>
    </button>
  );
}

export function ConnectedWalletStatus() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solWallets } = useSolanaWallets();

  const evmAddress = evmWallets?.[0]?.address ?? user?.wallet?.address;
  const solAddress = solWallets?.[0]?.address;
  const email = user?.email?.address ?? user?.google?.email;

  if (!ready) {
    return <p className="font-mono-custom text-sm text-muted-foreground">Loading account status...</p>;
  }

  if (authenticated) {
    return (
      <div>
        <div className="rounded-2xl border border-[#22c55e]/30 bg-[#0B1711] p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[.18em] text-[#4ade80] font-mono font-bold">
              Assigned Multi-Chain Wallets
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300">
              <ShieldCheck size={13} className="text-[#4ade80]" />
              Auto-Provisioned
            </span>
          </div>
          {email ? <p className="text-sm text-white font-semibold">{email}</p> : null}

          <div className="grid gap-2 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-white/10 bg-[#080C0F] p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Solana (Mainnet)
              </span>
              <p className="mt-1 break-all font-mono text-xs text-[#4ade80]">
                {solAddress ?? 'Provisioning Solana wallet...'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#080C0F] p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                EVM (Base / Ethereum / Arbitrum / Polygon)
              </span>
              <p className="mt-1 break-all font-mono text-xs text-sky-400">
                {evmAddress ?? 'Provisioning EVM wallet...'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Embedded wallets are automatically created and assigned on signup for Solana and EVM chains.
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
      <p className="text-sm text-muted-foreground">
        Sign in with Email or Google to automatically receive your Solana &amp; EVM wallets.
      </p>
      <WalletAuthButton className="mt-4" />
    </div>
  );
}
