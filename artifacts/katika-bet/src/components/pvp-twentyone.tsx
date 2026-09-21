import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useServerSession } from './server-session';
import { useLegend } from './legend-card';
import {
  ArrowLeft,
  Clock,
  Eye,
  Layers,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Info,
} from 'lucide-react';

export function PvP21Page() {
  const [, params] = useRoute('/pvp/21/:id');
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { serverUser } = useServerSession();
  const { legend } = useLegend();

  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glanceRevealed, setGlanceRevealed] = useState<string | null>(null);
  const [clockLeft, setClockLeft] = useState<number>(12);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatch = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/pvp/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Match not found');
        return;
      }
      const data = await res.json();
      setMatchData(data);
      if (data.match?.board?.me?.glancedCard) {
        setGlanceRevealed(data.match.board.me.glancedCard);
      }
    } catch (err) {
      console.error('Error polling 21 match:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    pollRef.current = setInterval(fetchMatch, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // Turn clock timer
  useEffect(() => {
    if (!matchData?.match || matchData.match.state !== 'live') return;
    const clockMs = matchData.match.board?.me?.clockMs || 12000;
    const interval = setInterval(() => {
      const lastAction = matchData.match.resolvedAt
        ? new Date(matchData.match.resolvedAt).getTime()
        : new Date(matchData.match.createdAt).getTime();
      const elapsed = Date.now() - lastAction;
      const remainingSec = Math.max(0, Math.ceil((clockMs - elapsed) / 1000));
      setClockLeft(remainingSec);
    }, 250);
    return () => clearInterval(interval);
  }, [matchData]);

  const act = async (action: 'hit' | 'stand' | 'double' | 'split' | 'glance') => {
    if (!id || acting) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/pvp/${id}/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Action failed');
      } else {
        await fetchMatch();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setActing(false);
    }
  };

  const abortMatch = async () => {
    if (!id || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/pvp/${id}/abort`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLocation('/pvp');
      } else {
        setError(data.error || 'Cannot abort match');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  const rematch = async () => {
    if (!id || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/pvp/${id}/rematch`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.newMatchId) {
        setLocation(`/pvp/21/${data.newMatchId}`);
      } else {
        setError(data.error || 'Failed to start rematch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#35D399] border-t-transparent" />
        <p className="mt-3 font-mono-custom text-xs text-[#8FA39A]">Dealing table...</p>
      </div>
    );
  }

  if (!matchData?.match) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-400">{error || 'Match not found'}</p>
        <Link href="/pvp" className="mt-4 inline-block text-xs text-[#35D399] underline">
          Return to PvP Floor
        </Link>
      </div>
    );
  }

  const match = matchData.match;
  const board = match.board;
  const isCreator = serverUser?.privyUserId === match.creatorId;
  const isOpponent = serverUser?.privyUserId === match.opponentId;
  const isParticipant = isCreator || isOpponent;

  const myLegend = isCreator ? matchData.creatorLegend : matchData.opponentLegend;
  const oppLegend = isCreator ? matchData.opponentLegend : matchData.creatorLegend;

  const me = board?.me;
  const opp = board?.opp;

  const myActiveHand = me?.hands?.[me.activeHandIndex || 0];
  const canAct = match.state === 'live' && me && myActiveHand && myActiveHand.status === 'playing';

  // Stat comparisons for tooltip / teaching badges
  const myStats = myLegend || legend;
  const theirStats = oppLegend;

  const canDouble = me?.perks?.double && myActiveHand?.cards?.length === 2;
  const canSplit = me?.perks?.split && myActiveHand?.cards?.length === 2;
  const canGlance = me?.perks?.glance && !me?.glanceUsed;

  const isResolved = match.state === 'resolved';
  const isWinner = isResolved && match.winnerId === serverUser?.privyUserId;
  const isPush = isResolved && (board?.isPush || match.winnerId === null);
  const isLoser = isResolved && !isWinner && !isPush;

  return (
    <div className="px-3 pt-2 pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#1C3A2E] pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/pvp"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:text-[#E8F2EC]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-custom text-[11px] font-bold text-[#35D399]">KATIKA 21</span>
              <span className="rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2 py-0.2 text-[9px] text-[#8FA39A]">
                {match.stake} KTK
              </span>
            </div>
            <p className="text-[10px] text-[#8FA39A]">Closest to 21. Bust loses.</p>
          </div>
        </div>

        {/* Live Clock / State indicator */}
        <div className="flex items-center gap-2">
          {match.state === 'live' && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#0E1A16] px-2.5 py-1 text-xs">
              <Clock size={13} className={clockLeft <= 4 ? 'animate-pulse text-red-400' : 'text-[#35D399]'} />
              <span className={`font-mono-custom font-bold ${clockLeft <= 4 ? 'text-red-400' : 'text-[#35D399]'}`}>
                {clockLeft}s
              </span>
            </div>
          )}
          {match.state === 'open' && (
            <button
              type="button"
              onClick={abortMatch}
              disabled={acting}
              className="rounded-lg border border-red-500/30 bg-red-950/20 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-900/30"
            >
              Abort & Refund
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Waiting Lobby Overlay if open challenge */}
      {match.state === 'open' && (
        <div className="mt-6 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#35D399]/10 text-[#35D399]">
            <Layers size={24} />
          </div>
          <h2 className="mt-3 text-base font-bold text-[#E8F2EC]">Waiting for Opponent</h2>
          <p className="mt-1 text-xs text-[#8FA39A]">
            Share this table link with any player to sit and start Katika 21:
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <input
              readOnly
              value={window.location.href}
              className="w-full max-w-xs rounded-lg border border-[#1C3A2E] bg-[#07110E] px-2.5 py-1.5 font-mono-custom text-xs text-[#E8F2EC]"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              className="rounded-lg bg-[#35D399] px-3 py-1.5 text-xs font-bold text-[#062018]"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* 21 TABLE FELT */}
      {match.state !== 'open' && (
        <div className="mt-3 space-y-4">
          {/* OPPONENT SECTION (Top of Table) */}
          <div className="relative rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-4">
            <div className="flex items-center justify-between border-b border-[#1C3A2E]/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded bg-[#1C3A2E] text-xs font-bold text-[#8FA39A]">
                  OPP
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-[#E8F2EC]">
                    {oppLegend?.name || 'Opponent'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8FA39A]">
                    <span>PAC {oppLegend?.pac ?? 50}</span>
                    <span>•</span>
                    <span>SHO {oppLegend?.sho ?? 50}</span>
                    <span>•</span>
                    <span>PAS {oppLegend?.pas ?? 50}</span>
                  </div>
                </div>
              </div>

              {/* Opponent Status / Total */}
              <div className="text-right">
                <span className="font-mono-custom text-xs font-bold text-[#f3d37a]">
                  {isResolved
                    ? `Total: ${opp?.hands?.[0]?.eval?.total ?? 0}`
                    : `Showing: ${opp?.upCard ? cardDisplayValue(opp.upCard) : '??'}`}
                </span>
                {opp?.hands?.[0]?.status === 'stand' && (
                  <span className="ml-2 rounded bg-blue-900/30 px-1.5 py-0.5 text-[9px] text-blue-300">
                    STood
                  </span>
                )}
                {opp?.hands?.[0]?.status === 'bust' && (
                  <span className="ml-2 rounded bg-red-900/30 px-1.5 py-0.5 text-[9px] text-red-300">
                    BUST
                  </span>
                )}
              </div>
            </div>

            {/* Opponent Cards */}
            <div className="mt-3 flex items-center justify-center gap-2.5">
              {opp?.hands?.[0]?.cards?.map((c: string, idx: number) => (
                <PlayingCard
                  key={idx}
                  card={c}
                  isHole={!isResolved && idx === 1}
                />
              ))}
            </div>
          </div>

          {/* TABLE CENTER POT & STAKES */}
          <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E]/80 bg-[#0A1612] px-4 py-2">
            <div className="flex items-center gap-2 font-mono-custom text-xs">
              <span className="text-[#8FA39A]">TABLE POT</span>
              <span className="font-bold text-[#35D399]">
                {match.stake * 2} KTK
              </span>
            </div>
            {me?.perks?.defSoak && (
              <div className="flex items-center gap-1 text-[10px] text-[#35D399]">
                <Shield size={12} />
                <span>DEF Soak Active (50% loss protection)</span>
              </div>
            )}
          </div>

          {/* PLAYER SECTION (Bottom of Table) */}
          <div className="relative rounded-2xl border border-[#1C3A2E] bg-gradient-to-t from-[#0E1A16] to-[#07110E] p-4">
            <div className="flex items-center justify-between border-b border-[#1C3A2E]/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded bg-[#35D399]/20 text-xs font-bold text-[#35D399]">
                  YOU
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-[#E8F2EC]">
                    {myLegend?.name || 'Your Legend'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8FA39A]">
                    <span>PAC {myLegend?.pac ?? 50}</span>
                    <span>•</span>
                    <span>SHO {myLegend?.sho ?? 50}</span>
                    <span>•</span>
                    <span>PAS {myLegend?.pas ?? 50}</span>
                  </div>
                </div>
              </div>

              {/* Player Status / Total */}
              <div className="text-right">
                <span className="font-mono-custom text-sm font-bold text-[#35D399]">
                  {myActiveHand?.eval?.isNatural21
                    ? '21 - Natural!'
                    : myActiveHand?.eval?.isBust
                    ? `Bust (${myActiveHand.eval.total})`
                    : `Total: ${myActiveHand?.eval?.total ?? 0}`}
                </span>
                {myActiveHand?.eval?.isSoft && (
                  <span className="ml-1.5 text-[10px] text-[#8FA39A]">(Soft)</span>
                )}
                {myActiveHand?.status === 'stand' && (
                  <span className="ml-2 rounded bg-blue-900/30 px-1.5 py-0.5 text-[9px] text-blue-300">
                    STood
                  </span>
                )}
              </div>
            </div>

            {/* Split hands tabs if split */}
            {me?.hands && me.hands.length > 1 && (
              <div className="mt-2 flex gap-2">
                {me.hands.map((h: any, idx: number) => (
                  <span
                    key={idx}
                    className={`rounded px-2 py-0.5 font-mono-custom text-[10px] ${
                      idx === me.activeHandIndex
                        ? 'border border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                        : 'border border-[#1C3A2E] bg-[#07110E] text-[#8FA39A]'
                    }`}
                  >
                    Hand #{idx + 1}: {h.eval.total} ({h.status})
                  </span>
                ))}
              </div>
            )}

            {/* Player Cards */}
            <div className="mt-4 flex items-center justify-center gap-2.5">
              {myActiveHand?.cards?.map((c: string, idx: number) => (
                <PlayingCard key={idx} card={c} isHole={false} />
              ))}
            </div>

            {/* Privately Glanced Card Peek */}
            {glanceRevealed && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#f3d37a]/30 bg-[#f3d37a]/10 px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#f3d37a]">
                  <Eye size={14} />
                  <span>Next shoe card (private peek):</span>
                </div>
                <span className="font-mono-custom font-bold text-[#f3d37a]">
                  {glanceRevealed}
                </span>
              </div>
            )}
          </div>

          {/* ACTION CONTROLS */}
          {match.state === 'live' && isParticipant && (
            <div className="space-y-2">
              {/* Primary Actions: HIT and STAND */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => act('hit')}
                  disabled={!canAct || acting}
                  className="rounded-xl border border-[#35D399]/50 bg-gradient-to-r from-[#208b61] to-[#35D399] py-3 text-sm font-bold text-[#062018] shadow-md transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  HIT (+ Card)
                </button>
                <button
                  type="button"
                  onClick={() => act('stand')}
                  disabled={!canAct || acting}
                  className="rounded-xl border border-[#1C3A2E] bg-[#122019] py-3 text-sm font-bold text-[#E8F2EC] transition-all hover:border-[#35D399]/40 active:scale-[0.98] disabled:opacity-40"
                >
                  STAND (Hold)
                </button>
              </div>

              {/* Stat-Gated Actions: Double (SHO), Split (PAS), Glance (DRI) */}
              <div className="grid grid-cols-3 gap-2">
                {/* DOUBLE (SHO) */}
                <button
                  type="button"
                  onClick={() => act('double')}
                  disabled={!canAct || !canDouble || acting}
                  title={
                    !me?.perks?.double
                      ? `Their SHO (${oppLegend?.sho ?? 50}) >= Yours (${myStats?.sho ?? 50})`
                      : 'Double stake and receive 1 card only'
                  }
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    canDouble
                      ? 'border-[#f3d37a]/50 bg-[#f3d37a]/10 text-[#f3d37a] hover:bg-[#f3d37a]/20'
                      : 'border-[#1C3A2E]/60 bg-[#07110E] text-[#5C7368] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Flame size={13} />
                    <span className="text-xs font-bold">Double</span>
                  </div>
                  <span className="block text-[9px] font-mono-custom mt-0.5">
                    {me?.perks?.double ? '2x Stake' : 'SHO locked'}
                  </span>
                </button>

                {/* SPLIT (PAS) */}
                <button
                  type="button"
                  onClick={() => act('split')}
                  disabled={!canAct || !canSplit || acting}
                  title={
                    !me?.perks?.split
                      ? `Their PAS (${oppLegend?.pas ?? 50}) >= Yours (${myStats?.pas ?? 50})`
                      : 'Split pair into 2 hands'
                  }
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    canSplit
                      ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30'
                      : 'border-[#1C3A2E]/60 bg-[#07110E] text-[#5C7368] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Layers size={13} />
                    <span className="text-xs font-bold">Split</span>
                  </div>
                  <span className="block text-[9px] font-mono-custom mt-0.5">
                    {me?.perks?.split ? 'Pair only' : 'PAS locked'}
                  </span>
                </button>

                {/* GLANCE (DRI) */}
                <button
                  type="button"
                  onClick={() => act('glance')}
                  disabled={!canAct || !canGlance || acting}
                  title={
                    !me?.perks?.glance
                      ? `Their DRI (${oppLegend?.dri ?? 50}) >= Yours (${myStats?.dri ?? 50})`
                      : 'Privately peek at the next shoe card'
                  }
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    canGlance
                      ? 'border-purple-500/50 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30'
                      : 'border-[#1C3A2E]/60 bg-[#07110E] text-[#5C7368] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Eye size={13} />
                    <span className="text-xs font-bold">Glance</span>
                  </div>
                  <span className="block text-[9px] font-mono-custom mt-0.5">
                    {me?.perks?.glance ? 'Peek Shoe' : 'DRI locked'}
                  </span>
                </button>
              </div>

              {/* Teaching Note on Stat Gating */}
              <div className="rounded-lg bg-[#0E1A16] px-3 py-1.5 text-[10px] text-[#8FA39A] flex items-center justify-between">
                <span>Special actions unlock when your card stat exceeds your opponent's.</span>
                <span className="text-[#35D399] font-mono-custom">SHO • PAS • DRI</span>
              </div>
            </div>
          )}

          {/* RESOLUTION OVERLAY */}
          {isResolved && (
            <div className="rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-5 text-center shadow-xl">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#35D399]/15 text-[#35D399]">
                <Trophy size={24} />
              </div>
              <h2 className="mt-3 text-lg font-bold text-[#E8F2EC]">
                {isPush
                  ? 'Push - Both Tied / Refunded'
                  : isWinner
                  ? 'Victory!'
                  : 'Opponent Won'}
              </h2>
              <p className="mt-1 font-mono-custom text-xs text-[#8FA39A]">
                {board?.resolutionSummary || 'Round complete'}
              </p>

              {/* Payout breakdown */}
              {board?.payout && (
                <div className="mx-auto mt-3 max-w-xs rounded-xl border border-[#1C3A2E] bg-[#07110E] p-3 text-left font-mono-custom text-xs space-y-1">
                  <div className="flex justify-between text-[#8FA39A]">
                    <span>Total Pot</span>
                    <span className="text-[#E8F2EC]">{board.payout.pot} KTK</span>
                  </div>
                  <div className="flex justify-between text-[#8FA39A]">
                    <span>House Rake (4%)</span>
                    <span className="text-[#E8F2EC]">{board.payout.rake} KTK</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1C3A2E] pt-1 font-bold">
                    <span className="text-[#35D399]">Winner Prize</span>
                    <span className="text-[#35D399]">{board.payout.prize} KTK</span>
                  </div>
                  {board.payout.loserRefund > 0 && (
                    <div className="flex justify-between text-[11px] text-[#f3d37a]">
                      <span>DEF Soak Refund</span>
                      <span>+{board.payout.loserRefund} KTK</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={rematch}
                  disabled={acting}
                  className="flex-1 rounded-xl bg-[#35D399] py-3 text-xs font-bold text-[#062018] shadow-md hover:bg-[#35D399]/90"
                >
                  Play Rematch
                </button>
                <Link
                  href="/pvp"
                  className="flex-1 rounded-xl border border-[#1C3A2E] bg-[#122019] py-3 text-center text-xs font-bold text-[#E8F2EC]"
                >
                  PvP Lobby
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Playing Card Visual Component
 */
function PlayingCard({ card, isHole }: { card: string; isHole: boolean }) {
  if (isHole || card === '??') {
    return (
      <div className="relative flex h-24 w-16 flex-col items-center justify-center rounded-xl border-2 border-[#1C3A2E] bg-gradient-to-br from-[#122019] via-[#0E1A16] to-[#07110E] shadow-lg">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-[#f3d37a]/30 bg-[#f3d37a]/10 font-bold text-[#f3d37a]">
          K
        </div>
        <span className="mt-1 font-mono-custom text-[9px] text-[#5C7368]">HOLE</span>
      </div>
    );
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const isRed = suit === 'H' || suit === 'D';

  const suitSymbols: Record<string, string> = {
    S: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
  };

  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div className="relative flex h-24 w-16 flex-col justify-between rounded-xl border border-neutral-300 bg-[#FAFBF9] p-2 text-neutral-900 shadow-md">
      <div className="flex flex-col items-start leading-none">
        <span className="font-bold text-sm font-mono-custom">{displayRank}</span>
        <span className={`text-xs ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
          {suitSymbols[suit] || suit}
        </span>
      </div>

      <div className="self-center">
        <span className={`text-xl ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
          {suitSymbols[suit] || suit}
        </span>
      </div>

      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="font-bold text-sm font-mono-custom">{displayRank}</span>
        <span className={`text-xs ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
          {suitSymbols[suit] || suit}
        </span>
      </div>
    </div>
  );
}

function cardDisplayValue(card: string): string {
  const rank = card.slice(0, -1);
  if (rank === 'A') return '11';
  if (['T', 'J', 'Q', 'K'].includes(rank)) return '10';
  return rank;
}
