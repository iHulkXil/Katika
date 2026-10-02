import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useServerSession } from './server-session';
import { useLegend } from './legend-card';
import {
  CircleDollarSign,
  Gamepad2,
  Layers,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
  ArrowRight,
  Shield,
  HelpCircle,
  Clock,
} from 'lucide-react';

export function PvPLobby() {
  const [, setLocation] = useLocation();
  const { serverUser } = useServerSession();
  const { legend } = useLegend();

  const [selectedGame, setSelectedGame] = useState<'pool' | 'ludo'>('pool');
  const [mode, setMode] = useState<'queue' | 'challenge'>('queue');
  const [stake, setStake] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  const maxWager = legend?.perkId === 'whale' ? 75 : 50;

  useEffect(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/pvp/recent');
      if (res.ok) {
        const data = await res.json();
        setRecentMatches(data.recent || []);
      }
    } catch (err) {
      console.error('Failed to load recent PvP matches:', err);
    }
  };

  const handleStart = async () => {
    if (!serverUser) {
      setError('Please connect your wallet first');
      return;
    }

    if (!legend?.profileComplete) {
      setError('Complete your Legend card attributes before entering PvP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/pvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: selectedGame,
          mode,
          stake,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create match');
        return;
      }

      const matchId = data.match.id;
      if (selectedGame === 'pool') {
        setLocation(`/pvp/pool/${matchId}`);
      } else {
        setLocation(`/pvp/ludo/${matchId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 pt-3 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">
            Peer-to-Peer Floor
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">PvP Arena</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-3 py-1 text-xs">
          <Shield size={13} className="text-[#35D399]" />
          <span className="font-mono-custom text-[#8FA39A]">4% Pot Rake</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-[#8FA39A]">
        Play 1v1 against other players. Settle instant pots in $KTK off-chain credits.
      </p>

      {/* Game Selector Tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedGame('pool')}
          className={`rounded-2xl border p-3.5 text-left transition-all ${
            selectedGame === 'pool'
              ? 'border-[#35D399] bg-[#0E1A16] shadow-[0_0_15px_rgba(53,211,153,0.2)]'
              : 'border-[#1C3A2E] bg-[#07110E] hover:border-[#1C3A2E]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-custom text-sm font-bold text-[#fef08a]">8-BALL</span>
            <span className="rounded bg-[#35D399]/20 px-1.5 py-0.5 font-mono-custom text-[9px] font-bold text-[#35D399]">
              Billiards
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-[#E8F2EC]">Katika Pool</h3>
          <p className="mt-0.5 text-[11px] text-[#8FA39A]">Solids vs Stripes · 8-Ball Wager</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedGame('ludo')}
          className={`rounded-2xl border p-3.5 text-left transition-all ${
            selectedGame === 'ludo'
              ? 'border-[#35D399] bg-[#0E1A16] shadow-[0_0_15px_rgba(53,211,153,0.2)]'
              : 'border-[#1C3A2E] bg-[#07110E] hover:border-[#1C3A2E]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-custom text-sm font-bold text-cyan-400">2T HOME</span>
            <span className="rounded bg-cyan-950/40 px-1.5 py-0.5 font-mono-custom text-[9px] font-bold text-cyan-400">
              Race
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-[#E8F2EC]">Club Ludo</h3>
          <p className="mt-0.5 text-[11px] text-[#8FA39A]">Sprint to Home · Captures & Blocks</p>
        </button>
      </div>

      {/* Game Details Banner */}
      <div className="mt-3 rounded-xl border border-[#1C3A2E] bg-[#0A1612] p-3">
        {selectedGame === 'pool' && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fef08a]">
              <Trophy size={14} />
              <span>Katika 8-Ball Pool: Realistic Billiards Arena</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8FA39A] leading-relaxed">
              Standard 8-ball rules on emerald baize cloth. Aim with precision laser guides and control stroke power. Sink your assigned set (Solids or Stripes) and pocket the 8-ball clean to win the pot! 4% house rake.
            </p>
          </div>
        )}
        {selectedGame === 'ludo' && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
              <Users size={14} />
              <span>Ludo Quick: 2 Tokens to Home</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8FA39A] leading-relaxed">
              Need a 6 to exit yard. Exact roll to home. Capture opponent off safe tiles. 2-token own-stacks form impassable blocks. Extra turn on 6, capture, or finish (max 3 in a row).
            </p>
          </div>
        )}
      </div>

      {/* Matchmaking Mode & Stake Setup */}
      <div className="mt-4 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4">
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-[#1C3A2E]/60 pb-3">
          <span className="text-xs font-semibold text-[#E8F2EC]">Match Type</span>
          <div className="flex rounded-lg border border-[#1C3A2E] bg-[#07110E] p-0.5">
            <button
              type="button"
              onClick={() => setMode('queue')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                mode === 'queue'
                  ? 'bg-[#35D399] text-[#062018]'
                  : 'text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              Quick Queue
            </button>
            <button
              type="button"
              onClick={() => setMode('challenge')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                mode === 'challenge'
                  ? 'bg-[#35D399] text-[#062018]'
                  : 'text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              Direct Link
            </button>
          </div>
        </div>

        {/* Stake Selector */}
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8F2EC]">Wager Stake</span>
            <span className="font-mono-custom text-xs font-bold text-[#35D399]">
              {stake} KTK (Pot: {stake * 2} KTK)
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {[10, 25, 50, 75].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={amt > maxWager}
                onClick={() => setStake(amt)}
                className={`rounded-xl border py-2 text-center font-mono-custom text-xs font-bold transition-all ${
                  stake === amt
                    ? 'border-[#35D399] bg-[#35D399]/15 text-[#35D399]'
                    : amt > maxWager
                    ? 'border-[#1C3A2E]/40 bg-[#07110E] text-[#5C7368] opacity-40 cursor-not-allowed'
                    : 'border-[#1C3A2E] bg-[#07110E] text-[#8FA39A] hover:text-[#E8F2EC]'
                }`}
              >
                {amt} KTK
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#208b61] to-[#35D399] py-3.5 text-sm font-bold text-[#062018] shadow-md transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#062018] border-t-transparent" />
          ) : (
            <>
              <span>{mode === 'queue' ? 'FIND MATCH' : 'CREATE TABLE'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Recent Matches */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#8FA39A]">
            Recent PvP Results
          </span>
          <span className="text-[10px] text-[#5C7368]">Live Feed</span>
        </div>

        <div className="mt-2 space-y-1.5">
          {recentMatches.length === 0 ? (
            <div className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-4 text-center text-xs text-[#8FA39A]">
              No recent PvP matches settled yet. Be the first to play!
            </div>
          ) : (
            recentMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-[#0E1A16] px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono-custom font-bold text-[#35D399] uppercase text-[10px]">
                    {m.game === '21' ? '21' : m.game === 'four' ? 'Four' : 'Ludo'}
                  </span>
                  <span className="text-[#8FA39A]">
                    {m.winnerId ? 'Winner Decided' : 'Draw/Refund'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono-custom">
                  <span className="text-[#8FA39A]">{m.stake} KTK</span>
                  {m.prize > 0 && (
                    <span className="font-bold text-[#f3d37a]">+{m.prize} KTK</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
