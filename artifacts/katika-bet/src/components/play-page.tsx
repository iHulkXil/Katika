import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';

type WalletView = {
  walletAddress: string | null;
  onChainKchip: number;
  allocatedKchip: number;
  playableKchip: number;
  chipContract: string | null;
};

export function PlayPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { serverUser } = useServerSession();
  const [address, setAddress] = useState('');
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/wallet/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) setWallet((await response.json()) as WalletView);
  };

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated]);

  const link = async () => {
    setStatus('Reading Sepolia...');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: address.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error((body as { error?: string }).error ?? 'Link failed');
      setWallet(body as WalletView);
      setStatus('KCHIP read');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Link failed');
    }
  };

  if (!ready) return <p className="px-3 pt-6 text-sm text-muted-foreground">Loading...</p>;

  if (!authenticated) {
    return (
      <div className="px-3 pt-6">
        <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">PLAY</p>
        <h1 className="mt-2 text-2xl font-semibold">Floor is locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in, then link the Sepolia address that claimed KCHIP.</p>
        <button type="button" onClick={() => void login()} className="mt-4 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground">Sign in</button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">KATIKA FLOOR</p>
      <h1 className="mt-2 text-2xl font-semibold">Play</h1>
      <p className="mt-2 text-sm text-muted-foreground">On-chain KCHIP minus points on a legend card. Games use the playable stack. Table balance is still {serverUser?.demoCredits ?? 0} KCHIP until we debit playable only.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">On-chain</p>
          <p className="mt-1 font-mono-custom text-lg">{wallet?.onChainKchip ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Allocated</p>
          <p className="mt-1 font-mono-custom text-lg">{wallet?.allocatedKchip ?? 0}</p>
        </div>
        <div className="rounded-xl border border-primary/40 bg-card p-3">
          <p className="text-[10px] uppercase text-primary">Playable</p>
          <p className="mt-1 font-mono-custom text-lg text-primary">{wallet?.playableKchip ?? 0}</p>
        </div>
      </div>
      <form
        className="mt-4 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void link();
        }}
      >
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={wallet?.walletAddress || '0x Sepolia address'}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono-custom text-xs"
        />
        <button type="submit" className="w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">Read KCHIP</button>
      </form>
      {status ? <p className="mt-2 text-xs text-muted-foreground">{status}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href="/games/dice" className="rounded-xl border border-border bg-card p-3 text-sm font-semibold">Dice</Link>
        <Link href="/games/coinflip" className="rounded-xl border border-border bg-card p-3 text-sm font-semibold">Flip</Link>
        <Link href="/games/mines" className="rounded-xl border border-border bg-card p-3 text-sm font-semibold">Mines</Link>
        <Link href="/games/roulette" className="rounded-xl border border-border bg-card p-3 text-sm font-semibold">Roulette</Link>
      </div>
      <Link href="/wallet" className="mt-4 inline-block text-xs text-primary">Claim / deposit KCHIP in Wallet</Link>
    </div>
  );
}
