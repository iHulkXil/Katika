import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { Swords, Shield, Zap, Trophy, History, RefreshCw, Flame, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'wouter';

type ClashRound = {
  lane: number;
  laneName: string;
  description: string;
  p1StatUsed: string;
  p1Score: number;
  p2StatUsed: string;
  p2Score: number;
  winner: 'p1' | 'p2' | 'draw';
  narrative: string;
};

type ClashResult = {
  clashId: number;
  stake: number;
  pot: number;
  houseRake: number;
  winnerPayout: number;
  won: boolean;
  netPayout: number;
  p1: { name: string; position: string; overall: number; pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number };
  p2: { name: string; position: string; overall: number; pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number };
  simulation: {
    p1Score: number;
    p2Score: number;
    winnerId: 'p1' | 'p2';
    rounds: ClashRound[];
  };
  stamina: number;
  dailySlots: number;
  slotsUsed: number;
};

type HistoryItem = {
  id: number;
  challengerCardName: string;
  opponentCardName: string;
  stake: number;
  pot: number;
  rake: number;
  winnerPrivyUserId: string;
  createdAt: string;
};

export function ClashPage() {
  const { authenticated, login, getAccessToken, user } = usePrivy();
  const { serverUser, reloadSession } = useServerSession();
  const [stake, setStake] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClashResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'arena' | 'history'>('arena');

  const maxWager = serverUser?.maxWager ?? 50;
  const stamina = serverUser?.stamina ?? 5;
  const dailySlots = serverUser?.dailySlots ?? 5;

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/clash/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.clashes ?? []);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && activeTab === 'history') {
      void loadHistory();
    }
  }, [authenticated, activeTab]);

  const handleQueue = async () => {
    if (!authenticated) {
      void login();
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/clash/queue', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stake }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Matchmaking failed');
      }

      setResult(data as ClashResult);
      await reloadSession();
    } catch (err: any) {
      setError(err.message || 'Clash failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 pt-2 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#35D399]/30 bg-gradient-to-br from-[#0E1A16] via-[#091511] to-[#050C0A] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#35D399]/20 text-[#35D399]">
              <Swords size={18} />
            </span>
            <div>
              <span className="font-mono-custom text-[10px] font-bold uppercase tracking-widest text-[#35D399]">
                PVP Simulation Arena
              </span>
              <h1 className="text-lg font-bold text-[#E8F2EC]">Legend Clash</h1>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono-custom text-[10px] uppercase text-[#8FA39A]">Daily Stamina</span>
            <div className="flex items-center justify-end gap-1 text-sm font-bold text-[#f3d37a]">
              <Zap size={14} className="fill-[#f3d37a]" />
              <span>{stamina} / {dailySlots}</span>
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
          Put your Legend's attributes to the test. 3 lanes of tactical combat, pegged 6% pot rake, instant KTK settlements.
        </p>

        {/* Tab switch */}
        <div className="mt-4 flex gap-2 border-t border-[#1C3A2E]/60 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'arena'
                ? 'bg-[#35D399] text-[#062018]'
                : 'bg-[#0E1A16] text-[#8FA39A] hover:text-white'
            }`}
          >
            <Swords size={14} /> Arena Floor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-[#35D399] text-[#062018]'
                : 'bg-[#0E1A16] text-[#8FA39A] hover:text-white'
            }`}
          >
            <History size={14} /> Match History
          </button>
        </div>
      </div>

      {activeTab === 'arena' ? (
        <div className="mt-4 space-y-4">
          {/* Stake selector card */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8FA39A] uppercase tracking-wider">Stake Amount</span>
              <span className="font-mono-custom text-xs text-[#35D399]">Max: {maxWager} KTK</span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[10, 25, 50, maxWager].filter((v, i, a) => a.indexOf(v) === i && v <= maxWager).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStake(val)}
                  className={`rounded-xl py-2.5 font-mono-custom text-sm font-bold transition-all ${
                    stake === val
                      ? 'border border-[#35D399] bg-[#35D399]/20 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.2)]'
                      : 'border border-[#1C3A2E] bg-[#07110E] text-[#8FA39A] hover:text-[#E8F2EC]'
                  }`}
                >
                  {val} KTK
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-[#1C3A2E]/80 bg-[#07110E] p-3 text-xs">
              <div className="flex justify-between text-[#8FA39A]">
                <span>Total Pot:</span>
                <span className="font-mono-custom text-[#E8F2EC]">{stake * 2} KTK</span>
              </div>
              <div className="mt-1 flex justify-between text-[#8FA39A]">
                <span>House Rake (Pegged 6%):</span>
                <span className="font-mono-custom text-[#f3d37a]">-{Math.round(stake * 2 * 0.06)} KTK</span>
              </div>
              <div className="mt-1 flex justify-between font-semibold text-[#35D399] border-t border-[#1C3A2E] pt-1">
                <span>Winner Payout:</span>
                <span className="font-mono-custom">{stake * 2 - Math.round(stake * 2 * 0.06)} KTK</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/30 p-2.5 text-center text-xs text-red-300">
                {error}
                {error.includes('Create and allocate') && (
                  <Link href="/legend" className="ml-2 font-bold underline text-[#35D399]">
                    Go to Legend Builder →
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={loading || stamina <= 0}
              onClick={() => void handleQueue()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#35D399] py-3.5 text-sm font-bold text-[#062018] shadow-[0_0_24px_rgba(53,211,153,0.3)] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} /> Simulating Clash...
                </>
              ) : stamina <= 0 ? (
                'Out of Daily Stamina'
              ) : (
                <>
                  <Swords size={16} /> Enter Arena ({stake} KTK)
                </>
              )}
            </button>
          </div>

          {/* Clash Result Showcase */}
          {result && (
            <div className="rounded-2xl border border-[#35D399]/40 bg-[#0E1A16] p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono-custom text-xs font-bold uppercase tracking-wider ${
                  result.won
                    ? 'border border-[#35D399]/60 bg-[#35D399]/20 text-[#35D399]'
                    : 'border border-red-500/60 bg-red-950/40 text-red-400'
                }`}>
                  {result.won ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {result.won ? `VICTORY · +${result.winnerPayout} KTK` : `DEFEAT · -${result.stake} KTK`}
                </span>
                <h3 className="mt-2 text-xl font-black text-[#E8F2EC]">
                  {result.simulation.p1Score} - {result.simulation.p2Score}
                </h3>
              </div>

              {/* Matchup Header */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-y border-[#1C3A2E] py-3">
                <div className="text-left">
                  <span className="font-mono-custom text-[10px] text-[#35D399]">YOUR LEGEND</span>
                  <p className="text-sm font-bold text-[#E8F2EC] truncate">{result.p1.name}</p>
                  <p className="font-mono-custom text-xs text-[#8FA39A]">OVR {result.p1.overall} · {result.p1.position}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono-custom text-[10px] text-[#f3d37a]">OPPONENT</span>
                  <p className="text-sm font-bold text-[#E8F2EC] truncate">{result.p2.name}</p>
                  <p className="font-mono-custom text-xs text-[#8FA39A]">OVR {result.p2.overall} · {result.p2.position}</p>
                </div>
              </div>

              {/* Lane breakdown */}
              <div className="mt-4 space-y-2.5">
                <span className="text-[10px] font-semibold text-[#8FA39A] uppercase tracking-wider">Lane Encounters</span>
                {result.simulation.rounds.map((round) => (
                  <div
                    key={round.lane}
                    className="rounded-xl border border-[#1C3A2E]/80 bg-[#07110E] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#E8F2EC]">{round.laneName}</span>
                      <span className={`font-mono-custom text-[11px] ${
                        round.winner === 'p1'
                          ? 'text-[#35D399]'
                          : round.winner === 'p2'
                            ? 'text-red-400'
                            : 'text-[#8FA39A]'
                      }`}>
                        {round.p1Score} vs {round.p2Score} ({round.winner === 'p1' ? 'Win' : round.winner === 'p2' ? 'Loss' : 'Tie'})
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8FA39A] italic">{round.narrative}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#1C3A2E] pt-3 text-[11px] text-[#8FA39A]">
                <span>House Rake: {result.houseRake} KTK (6%)</span>
                <span>Clash #{result.clashId}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="mt-4 space-y-2.5">
          {historyLoading ? (
            <div className="p-8 text-center text-xs text-[#8FA39A]">Loading clash records...</div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-8 text-center text-xs text-[#8FA39A]">
              No battles logged yet. Enter the arena to claim your first victory!
            </div>
          ) : (
            history.map((h) => {
              const won = h.winnerPrivyUserId === user?.id;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-1.5 py-0.5 font-mono-custom text-[9px] font-bold uppercase ${
                        won ? 'bg-[#35D399]/20 text-[#35D399]' : 'bg-red-950/40 text-red-400'
                      }`}>
                        {won ? 'WON' : 'LOST'}
                      </span>
                      <span className="font-semibold text-[#E8F2EC]">{h.challengerCardName} vs {h.opponentCardName}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#8FA39A]">Stake: {h.stake} KTK · Pot: {h.pot} KTK · Rake: {h.rake} KTK</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono-custom font-bold ${won ? 'text-[#35D399]' : 'text-red-400'}`}>
                      {won ? `+${h.pot - h.rake} KTK` : `-${h.stake} KTK`}
                    </span>
                    <p className="text-[10px] text-[#5C7368]">{new Date(h.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
