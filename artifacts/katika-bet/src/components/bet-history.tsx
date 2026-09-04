import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Bet = {
  id: number;
  game: string;
  wager: number;
  payout: number;
  won: boolean;
  createdAt: string;
};

export function BetHistory() {
  const { authenticated, getAccessToken } = usePrivy();
  const [bets, setBets] = useState<Bet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setBets([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const response = await fetch('/api/bets', { headers: { Authorization: `Bearer ${token}` } });
        const text = await response.text();
        const body = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(body.error ?? 'Could not load history');
        if (!cancelled) setBets(body.bets ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'History failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, getAccessToken]);

  if (!authenticated) return <p className="mt-4 text-sm text-muted-foreground">Sign in to see demo bet history.</p>;
  if (error) return <p className="mt-4 text-sm text-destructive">{error}</p>;
  if (!bets) return <p className="mt-4 text-sm text-muted-foreground">Loading history...</p>;
  if (bets.length === 0) return <p className="mt-4 text-sm text-muted-foreground">No demo bets yet.</p>;

  return (
    <ul className="mt-4 space-y-2">
      {bets.map((bet) => (
        <li key={bet.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <span className="capitalize">{bet.game}</span>
          <span className="font-mono-custom text-xs text-muted-foreground">{bet.wager}</span>
          <span className={`font-mono-custom ${bet.won ? 'text-primary' : 'text-muted-foreground'}`}>
            {bet.payout > 0 ? '+' : ''}{bet.payout}
          </span>
        </li>
      ))}
    </ul>
  );
}
