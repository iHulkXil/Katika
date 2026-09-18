import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { WagerRow } from '@/components/wager-row';
import { useToast } from '@/hooks/use-toast';
import {
  CircleDot,
  Dices,
  Flame,
  Gamepad2,
  Lock,
  Plus,
  RefreshCw,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

interface RecentClubMatch {
  id: string;
  game: 'four' | 'ludo';
  creatorId: string;
  opponentId: string | null;
  winnerId: string | null;
  stake: number;
  prize: number;
  resolvedAt: string;
}

export function ClubLobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { session, refresh: refreshSession } = useServerSession();
  const { card } = useLegend();

  const [selectedGame, setSelectedGame] = useState<'four' | 'ludo'>('four');
  const [selectedMode, setSelectedMode] = useState<'queue' | 'challenge'>('queue');
  const [stake, setStake] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [recentMatches, setRecentMatches] = useState<RecentClubMatch[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const playable = session?.playable ?? 0;
  const stamina = session?.stamina ?? 0;
  const maxWager = session?.maxWager ?? 50;
  const isProfileReady = Boolean(card?.profileComplete);

  const fetchRecent = async () => {
    try {
      setLoadingRecent(true);
      const res = await fetch('/api/club/recent');
      if (res.ok) {
        const data = await res.json();
        setRecentMatches(data.recent ?? []);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleCreateOrQueue = async () => {
    if (!isProfileReady) {
      toast({
        title: 'Legend Card Required',
        description: 'You must allocate your Legend card attributes before playing in Club.',
        variant: 'destructive',
      });
      setLocation('/legend');
      return;
    }

    if (stamina <= 0) {
      toast({
        title: 'No Stamina Left',
        description: 'PHY stamina slots refresh daily at 00:00 UTC.',
        variant: 'destructive',
      });
      return;
    }

    if (playable < stake) {
      toast({
        title: 'Insufficient KTK',
        description: `You need ${stake} KTK to enter this match.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setBusy(true);
      const res = await fetch('/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: selectedGame,
          mode: selectedMode,
          stake,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enter match');
      }

      await refreshSession();

      if (data.match) {
        const path = selectedGame === 'four' ? `/club/four/${data.match.id}` : `/club/ludo/${data.match.id}`;
        setLocation(path);
      }
    } catch (err: any) {
      toast({
        title: 'Matchmaking Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-br from-[#0E1A16] via-[#091512] to-[#040A08] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute right-0 top-0 -mr-8 -mt-8 h-36 w-36 rounded-full bg-[#35D399]/10 blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1 rounded-full bg-[#35D399]/15 px-2.5 font-mono-custom text-[11px] font-bold text-[#35D399] ring-1 ring-[#35D399]/30">
                <Flame className="h-3 w-3 fill-current" />
                CLASH MONEY CLUB
              </span>
              <span className="text-[11px] text-[#8FA39A]">4% House Rake · 96% Prize</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[#E8F2EC]">
              Club Arena
            </h1>
            <p className="text-xs text-[#8FA39A]">
              Classic peer-to-peer strategy games. Same KTK wallet and PHY stamina slots as Clash.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono-custom text-xs text-[#8FA39A]">Playable KTK</div>
            <div className="font-mono-custom text-xl font-extrabold text-[#35D399]">
              {playable.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 font-mono-custom text-[11px] text-[#8FA39A]">
              <Zap className="h-3 w-3 text-[#f3d37a]" />
              <span>{stamina} Stamina left</span>
            </div>
          </div>
        </div>

        {/* Legend Card Mini Status */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1C3A2E]/80 bg-[#07110E]/80 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#f3d37a]" />
            <span className="text-[#8FA39A]">Identity Card:</span>
            <span className="font-semibold text-[#E8F2EC]">{card?.name || 'Unassigned Legend'}</span>
            {card?.position && (
              <span className="rounded bg-[#122019] px-1.5 py-0.5 font-mono-custom text-[10px] text-[#35D399]">
                {card.position}
              </span>
            )}
          </div>
          {!isProfileReady ? (
            <Link href="/legend" className="font-semibold text-[#35D399] hover:underline">
              Complete Card →
            </Link>
          ) : (
            <span className="text-[11px] text-[#35D399]">Ready</span>
          )}
        </div>
      </div>

      {/* Game Selector Tiles */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8FA39A]">
          Choose Club Game
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Connect Four Tile */}
          <button
            type="button"
            onClick={() => setSelectedGame('four')}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
              selectedGame === 'four'
                ? 'border-[#35D399] bg-gradient-to-br from-[#12241E] to-[#0A1612] shadow-[0_0_20px_rgba(53,211,153,0.18)]'
                : 'border-[#1C3A2E] bg-[#0A1512] hover:border-[#1C3A2E]/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 ring-1 ring-red-500/40">
                <CircleDot className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-[#122019] px-2 py-0.5 font-mono-custom text-[10px] text-[#8FA39A]">
                7×6 Grid
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-[#E8F2EC]">Connect Four</h3>
            <p className="mt-1 text-[11px] text-[#8FA39A]">
              Creator is Red & drops first. First to align 4 wins. 15s drop clock.
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[#1C3A2E]/60 pt-2 text-[11px] font-mono-custom">
              <span className="text-yellow-400">PvP Turn-Based</span>
              <span className={selectedGame === 'four' ? 'text-[#35D399] font-bold' : 'text-[#8FA39A]'}>
                {selectedGame === 'four' ? 'SELECTED' : 'SELECT'}
              </span>
            </div>
          </button>

          {/* Ludo Quick Tile */}
          <button
            type="button"
            onClick={() => setSelectedGame('ludo')}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
              selectedGame === 'ludo'
                ? 'border-[#35D399] bg-gradient-to-br from-[#12241E] to-[#0A1612] shadow-[0_0_20px_rgba(53,211,153,0.18)]'
                : 'border-[#1C3A2E] bg-[#0A1512] hover:border-[#1C3A2E]/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                <Dices className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-[#122019] px-2 py-0.5 font-mono-custom text-[10px] text-[#8FA39A]">
                2 Tokens
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-[#E8F2EC]">Ludo Quick</h3>
            <p className="mt-1 text-[11px] text-[#8FA39A]">
              Fast 2-player mode. 6 leaves yard, captures, safe tiles, 2-stack blocks.
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[#1C3A2E]/60 pt-2 text-[11px] font-mono-custom">
              <span className="text-amber-400">Server RNG</span>
              <span className={selectedGame === 'ludo' ? 'text-[#35D399] font-bold' : 'text-[#8FA39A]'}>
                {selectedGame === 'ludo' ? 'SELECTED' : 'SELECT'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Stake & Match Configuration Card */}
      <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1512] p-4 space-y-4">
        <div>
          <div className="mb-1.5 text-xs font-semibold text-[#8FA39A]">Stake Configuration</div>
          <WagerRow
            wager={stake}
            setWager={setStake}
            balance={playable}
            maxWager={maxWager}
            busy={busy}
          />
        </div>

        {/* Mode Selector */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-[#8FA39A]">Matchmaking Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMode('queue')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                selectedMode === 'queue'
                  ? 'border-[#35D399] bg-[#122019] text-[#35D399]'
                  : 'border-[#1C3A2E] bg-[#07110E] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <Users className="h-4 w-4" />
              Public Queue (Auto-Match)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('challenge')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                selectedMode === 'challenge'
                  ? 'border-[#35D399] bg-[#122019] text-[#35D399]'
                  : 'border-[#1C3A2E] bg-[#07110E] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <Share2 className="h-4 w-4" />
              Direct Challenge Link
            </button>
          </div>
        </div>

        {/* Prize & Rake Summary */}
        <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E]/60 bg-[#07110E] px-3.5 py-2.5 text-xs font-mono-custom">
          <div>
            <span className="text-[#8FA39A]">Total Pot: </span>
            <span className="font-bold text-[#E8F2EC]">{stake * 2} KTK</span>
          </div>
          <div>
            <span className="text-[#8FA39A]">House Rake (4%): </span>
            <span className="text-[#f3d37a]">{Math.floor(stake * 2 * 0.04)} KTK</span>
          </div>
          <div>
            <span className="text-[#8FA39A]">Winner Prize: </span>
            <span className="font-bold text-[#35D399]">{stake * 2 - Math.floor(stake * 2 * 0.04)} KTK</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={busy || !isProfileReady || stamina <= 0 || playable < stake}
          onClick={handleCreateOrQueue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#35D399] py-3.5 font-mono-custom text-sm font-bold text-[#062018] shadow-[0_4px_16px_rgba(53,211,153,0.3)] transition-all hover:bg-[#35D399]/90 active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Gamepad2 className="h-4 w-4" />
          )}
          {selectedMode === 'queue'
            ? `Find ${selectedGame === 'four' ? 'Connect Four' : 'Ludo'} Match (${stake} KTK)`
            : `Create Challenge Link (${stake} KTK)`}
        </button>
      </div>

      {/* Recent Matches Feed */}
      <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1512] p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C3A2E]/60">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8F2EC]">
            <Trophy className="h-4 w-4 text-[#f3d37a]" />
            Recent Club Matches
          </div>
          <button
            type="button"
            onClick={fetchRecent}
            className="flex items-center gap-1 text-[11px] text-[#8FA39A] hover:text-[#35D399]"
          >
            <RefreshCw className={`h-3 w-3 ${loadingRecent ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8FA39A]">
            No recent Club matches recorded yet. Be the first to play!
          </div>
        ) : (
          <div className="divide-y divide-[#1C3A2E]/40">
            {recentMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#122019] px-2 py-0.5 font-mono-custom text-[10px] text-[#35D399]">
                    {m.game === 'four' ? 'Connect 4' : 'Ludo'}
                  </span>
                  <span className="text-[#8FA39A]">Stake: {m.stake} KTK</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-custom text-[#35D399] font-bold">
                    Prize: {m.prize} KTK
                  </span>
                  <Link
                    href={m.game === 'four' ? `/club/four/${m.id}` : `/club/ludo/${m.id}`}
                    className="text-[11px] text-[#8FA39A] hover:text-[#35D399]"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
