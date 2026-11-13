import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { Clock, ArrowUpRight, Trophy, Loader2, Swords, ShieldCheck } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { fetchPositions, claimWinnings, type Position } from '@/lib/markets-api';
import { useToast } from '@/hooks/use-toast';
import { pushNotification } from '@/lib/notifications';
import { getWalletBalance, setWalletBalance } from '@/lib/balance';
import { SOLANA_CLUSTER_NAME } from '@/main';

type AutoPvpSettlement = {
  id: string;
  matchKey: string;
  game: 'pool' | 'wheel';
  stakeUsd: number;
  cryptoType: string;
  cryptoAmount: number;
  won: boolean;
  payoutUsd: number;
  settledAt: string;
};

export function MyBets() {
  const { user, authenticated, getAccessToken } = usePrivy();
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [pvpSettlements, setPvpSettlements] = useState<AutoPvpSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address;

  const loadPositions = useCallback(async () => {
    try {
      const data = await fetchPositions(walletAddress);
      setPositions(data);

      if (authenticated) {
        const token = await getAccessToken();
        if (token) {
          const pvpRes = await fetch('/api/pvp/settlements', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pvpRes.ok) {
            const pvpData = await pvpRes.json();
            if (Array.isArray(pvpData?.settlements)) {
              setPvpSettlements(pvpData.settlements);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user positions:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, authenticated, getAccessToken]);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  const handleClaim = async (posId: string) => {
    setClaimingId(posId);
    try {
      const payout = await claimWinnings(posId);
      // Credit to user cash balance
      const currentBal = getWalletBalance(user?.id);
      const payoutUsd = payout * 148.5; // ~148.50 per SOL
      setWalletBalance(user?.id, currentBal + payoutUsd);

      toast({
        title: 'Winnings Claimed!',
        description: `Successfully claimed +${payout.toFixed(3)} SOL ($${payoutUsd.toFixed(2)}) into your available balance.`,
      });

      pushNotification({
        title: 'Winnings Claimed',
        message: `Added +$${payoutUsd.toFixed(2)} (+${payout.toFixed(3)} SOL) to your dollar balance.`,
        type: 'win',
        href: '/wallet',
        userId: user?.id,
      });

      await loadPositions();
    } catch (err: any) {
      toast({
        title: 'Claim Failed',
        description: err.message || 'Could not claim position payout',
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const totalStaked = positions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalWon = positions
    .filter((p) => p.status === 'won' || p.status === 'claimed')
    .reduce((acc, p) => acc + (p.payout || p.amount * p.odds), 0);
  const openPositions = positions.filter((p) => p.status === 'open');
  const potentialPayout = openPositions.reduce((acc, p) => acc + ((p.amount || 0) * (p.odds || 1)), 0);

  return (
    <div className="space-y-5">
      {/* Positions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2">
            <span>Active Wagers & Positions</span>
            {loading && <Loader2 size={15} className="animate-spin text-[#4ADE80]" />}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Market bets are resolved and settled by Sidebet Admin. PvP bets settle automatically on match finish.
          </p>
        </div>

        {/* Portfolio Mini Stats */}
        <div className="flex items-center gap-4 bg-[#121820] border border-white/[0.08] rounded-2xl px-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Active Stake</div>
            <div className="font-mono text-sm font-bold text-white tabular-nums">{totalStaked.toFixed(2)} SOL</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Potential / Won</div>
            <div className="font-mono text-sm font-bold text-[#4ade80] tabular-nums">
              +{potentialPayout > 0 ? potentialPayout.toFixed(2) : totalWon.toFixed(2)} SOL
            </div>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0E1318]/40 py-16 px-4 text-center">
          <p className="text-sm font-medium text-slate-300">No active positions found in your ledger.</p>
          <p className="mt-1 text-xs text-slate-500">Pick an outcome from the live prediction markets to place a real stake.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 transition-all active:scale-95"
          >
            Explore Live Markets <ArrowUpRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => {
            const potentialWin = (p.amount * p.odds).toFixed(3);
            const isYes = p.side === 'YES';
            const isWon = p.status === 'won';
            const isClaimed = p.status === 'claimed';
            const isLost = p.status === 'lost';

            return (
              <div
                key={p.id}
                className={`rounded-3xl border p-4 transition-all ${
                  isWon
                    ? 'border-[#4ade80]/60 bg-[#121B16] shadow-[0_0_20px_rgba(74,222,128,0.15)] ring-1 ring-[#4ade80]/40'
                    : 'border-white/[0.08] bg-[#0E1318] hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        isYes
                          ? 'border border-[#22c55e]/40 bg-[#22c55e]/15 text-[#4ade80]'
                          : 'border border-[#ec4899]/40 bg-[#ec4899]/15 text-[#f472b6]'
                      }`}
                    >
                      {p.side}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Odds {p.odds}×</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full ${
                        isWon
                          ? 'bg-[#22c55e] text-black font-bold shadow-md shadow-[#22c55e]/30'
                          : isClaimed
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : isLost
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#4ade80]'
                      }`}
                    >
                      {p.status === 'open' ? 'OPEN · ADMIN SETTLE' : p.status}
                    </span>

                    {/* Claim Button for Won positions */}
                    {isWon && (
                      <button
                        type="button"
                        disabled={claimingId === p.id}
                        onClick={() => handleClaim(p.id)}
                        className="rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-3 py-1 text-[11px] font-mono font-bold text-black shadow-md shadow-[#22c55e]/30 transition-all flex items-center gap-1"
                      >
                        {claimingId === p.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trophy size={12} />
                        )}
                        <span>Claim +{potentialWin} SOL</span>
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="mt-2 text-sm font-bold text-white leading-snug">
                  {p.title}
                </h3>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Stake: <strong className="text-white font-bold">{p.amount} SOL</strong></span>
                    <span>·</span>
                    <span>
                      {isWon || isClaimed ? 'Payout' : 'Potential Return'}:{' '}
                      <strong className="text-[#4ade80] font-bold">+{potentialWin} SOL</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {p.txSig && (
                      <a
                        href={`https://solscan.io/tx/${p.txSig}${SOLANA_CLUSTER_NAME === 'devnet' ? '?cluster=devnet' : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4ade80] hover:underline"
                      >
                        Solscan Tx
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {p.placedAt ? p.placedAt.slice(0, 10) : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Automated PvP Settlements */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-[#4ade80]" />
            <h3 className="text-sm font-bold text-white">PvP Match History (Auto-Settled)</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25 px-2.5 py-0.5 text-[10px] font-mono text-[#4ade80]">
            <ShieldCheck size={11} /> Automatic Payouts
          </span>
        </div>

        {pvpSettlements.length === 0 ? (
          <p className="text-xs text-slate-400">
            No settled PvP matches yet. Play <Link href="/games/pool" className="text-[#4ade80] hover:underline">8-Ball Pool</Link> or <Link href="/games/wheel" className="text-[#FACC15] hover:underline">Wheel of Fortune</Link>—winnings settle automatically into your balance.
          </p>
        ) : (
          <div className="space-y-2">
            {pvpSettlements.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#080C0F] px-3.5 py-2.5 text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-white">
                    {s.game === 'pool' ? '8-Ball Pool' : 'Wheel of Fortune'}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Stake: ${s.stakeUsd.toFixed(2)} ({s.cryptoAmount} {s.cryptoType})
                  </span>
                </div>
                <div className="text-right">
                  <span className={s.won ? 'font-bold text-[#4ade80]' : 'font-bold text-rose-400'}>
                    {s.won ? `+$${s.payoutUsd.toFixed(2)} WON` : 'SETTLED · LOST'}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {s.settledAt.slice(0, 10)} · Auto-Settled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
