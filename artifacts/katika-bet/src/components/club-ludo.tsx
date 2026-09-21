import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Dices,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

interface LudoToken {
  id: 0 | 1;
  pos: string; // "yard" | "ring:X" | "home:Y" | "done"
}

interface LudoBoard {
  phase: 'await_roll' | 'await_move';
  die: number;
  extras: number;
  legal: number[];
  red: [LudoToken, LudoToken];
  yellow: [LudoToken, LudoToken];
  lastRoll?: number;
  lastAction?: string;
}

interface ClubMatchResponse {
  match: {
    id: string;
    game: string;
    ruleset: string;
    creatorId: string;
    opponentId: string | null;
    stake: number;
    mode: string;
    state: 'open' | 'live' | 'resolved' | 'aborted' | 'expired';
    turnUserId: string | null;
    board: LudoBoard;
    winnerId: string | null;
    rake: number | null;
    prize: number | null;
    createdAt: string;
    resolvedAt: string | null;
  };
  creatorLegend?: {
    name: string;
    position: string;
    perkId: string;
  } | null;
  opponentLegend?: {
    name: string;
    position: string;
    perkId: string;
  } | null;
}

const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];

export function ClubLudoPage() {
  const [, paramsPvp] = useRoute('/pvp/ludo/:id');
  const [, paramsClub] = useRoute('/club/ludo/:id');
  const [, setLocation] = useLocation();
  const matchId = paramsPvp?.id || paramsClub?.id;
  const { session, refresh: refreshSession } = useServerSession();
  const { toast } = useToast();

  const [data, setData] = useState<ClubMatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [rollingAnim, setRollingAnim] = useState(false);

  const fetchMatch = async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`/api/club/${matchId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast({ title: 'Match not found', variant: 'destructive' });
          setLocation('/club');
        }
        return;
      }
      const json: ClubMatchResponse = await res.json();
      setData(json);
    } catch {
      // Transient error
    } finally {
      setLoading(false);
    }
  };

  // Poll every 1s
  useEffect(() => {
    fetchMatch();
    const interval = setInterval(() => {
      if (data?.match?.state === 'open' || data?.match?.state === 'live') {
        fetchMatch();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [matchId, data?.match?.state]);

  // Turn timer countdown (20s)
  useEffect(() => {
    if (data?.match?.state !== 'live') {
      setTimeLeft(20);
      return;
    }

    const lastTime = data.match.resolvedAt
      ? new Date(data.match.resolvedAt).getTime()
      : new Date(data.match.createdAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTime) / 1000);
      const remaining = Math.max(0, 20 - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const t = setInterval(updateTimer, 500);
    return () => clearInterval(t);
  }, [data?.match?.resolvedAt, data?.match?.state]);

  const match = data?.match;
  const board = match?.board;
  const isCreator = Boolean(session?.profileComplete && data?.creatorLegend?.name);

  // Turn checks
  const isRedTurn = match?.turnUserId === match?.creatorId;
  const myTurn = match?.state === 'live' && (
    (isRedTurn && isCreator) || (!isRedTurn && !isCreator)
  );

  const handleRoll = async () => {
    if (!matchId || busy || !myTurn || board?.phase !== 'await_roll') return;

    try {
      setBusy(true);
      setRollingAnim(true);
      const res = await fetch(`/api/club/${matchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'roll' }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to roll dice');
      }

      setTimeout(() => {
        setRollingAnim(false);
        setData((prev) => (prev ? { ...prev, match: json.match } : null));
      }, 500);

      await refreshSession();
    } catch (err: any) {
      setRollingAnim(false);
      toast({ title: 'Roll Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (token: 0 | 1) => {
    if (!matchId || busy || !myTurn || board?.phase !== 'await_move') return;

    try {
      setBusy(true);
      const res = await fetch(`/api/club/${matchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'move', token }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to move token');
      }

      setData((prev) => (prev ? { ...prev, match: json.match } : null));
      await refreshSession();
    } catch (err: any) {
      toast({ title: 'Move Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptMatch = async () => {
    if (!matchId || busy) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/club/${matchId}/accept`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to accept challenge');
      setData((prev) => (prev ? { ...prev, match: json.match } : null));
      await refreshSession();
      toast({ title: 'Challenge Accepted!', description: 'Match is now live. Red rolls first.' });
    } catch (err: any) {
      toast({ title: 'Accept Failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleAbort = async () => {
    if (!matchId || busy) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/club/${matchId}/abort`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Cannot abort match');
      setData((prev) => (prev ? { ...prev, match: json.match } : null));
      await refreshSession();
      toast({ title: 'Match Aborted', description: 'Full stake has been refunded.' });
    } catch (err: any) {
      toast({ title: 'Abort Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleRematch = async () => {
    if (!matchId || busy) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/club/${matchId}/rematch`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rematch failed');
      await refreshSession();
      setLocation(`/pvp/ludo/${json.newMatchId}`);
    } catch (err: any) {
      toast({ title: 'Rematch Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: 'Link Copied', description: 'Share this link to invite an opponent.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-sm text-[#8FA39A]">
          <Dices className="h-6 w-6 animate-spin text-[#35D399]" />
          Loading Ludo Quick match...
        </div>
      </div>
    );
  }

  if (!match || !board) return null;

  const pot = match.stake * 2;
  const rake = Math.floor(pot * 0.04);
  const prize = pot - rake;

  // Check if any token has moved out of yard
  const redInYard = board.red.every((t) => t.pos === 'yard');
  const yellowInYard = board.yellow.every((t) => t.pos === 'yard');
  const canAbort = match.state === 'open' || (match.state === 'live' && redInYard && yellowInYard);

  const myTokens = isRedTurn ? board.red : board.yellow;
  const currentColor = isRedTurn ? 'red' : 'yellow';

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-12">
      {/* Top Match Bar */}
      <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1512] p-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1C3A2E]/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
              <Dices className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#E8F2EC]">Ludo Quick (2 Tokens)</h2>
              <div className="text-[11px] text-[#8FA39A]">
                Stake: {match.stake} KTK · Pot: {pot} KTK · Prize: {prize} KTK
              </div>
            </div>
          </div>

          {/* State / Timer Badge */}
          <div className="text-right">
            {match.state === 'open' && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-mono-custom text-[11px] font-bold text-amber-400 ring-1 ring-amber-500/30">
                Waiting for Opponent
              </span>
            )}
            {match.state === 'live' && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#122019] px-2.5 py-1 text-[11px] font-mono-custom text-[#35D399] ring-1 ring-[#1C3A2E]">
                <Clock className="h-3 w-3 animate-pulse text-amber-400" />
                <span>{timeLeft}s Clock</span>
              </div>
            )}
            {match.state === 'resolved' && (
              <span className="rounded-full bg-[#35D399]/20 px-2.5 py-1 font-mono-custom text-[11px] font-bold text-[#35D399]">
                Match Resolved
              </span>
            )}
            {match.state === 'aborted' && (
              <span className="rounded-full bg-red-500/20 px-2.5 py-1 font-mono-custom text-[11px] font-bold text-red-400">
                Aborted (Refunded)
              </span>
            )}
          </div>
        </div>

        {/* Players HUD */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          {/* Red Player (Creator) */}
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              isRedTurn && match.state === 'live'
                ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'border-[#1C3A2E] bg-[#07110E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="font-bold text-[#E8F2EC]">{data?.creatorLegend?.name || 'Red Player'}</span>
              </div>
              <span className="font-mono-custom text-[10px] text-red-400 font-bold">RED (1st)</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#8FA39A]">
              <span>T1: {board.red[0].pos}</span>
              <span>T2: {board.red[1].pos}</span>
            </div>
          </div>

          {/* Yellow Player (Opponent) */}
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              !isRedTurn && match.state === 'live'
                ? 'border-yellow-400 bg-yellow-950/20 ring-1 ring-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'border-[#1C3A2E] bg-[#07110E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                <span className="font-bold text-[#E8F2EC]">
                  {data?.opponentLegend?.name || (match.opponentId ? 'Yellow Player' : 'Open Seat')}
                </span>
              </div>
              <span className="font-mono-custom text-[10px] text-yellow-400 font-bold">YELLOW</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#8FA39A]">
              <span>T1: {board.yellow[0].pos}</span>
              <span>T2: {board.yellow[1].pos}</span>
            </div>
          </div>
        </div>

        {/* 20s Timer Bar */}
        {match.state === 'live' && (
          <div className="mt-3 overflow-hidden rounded-full bg-[#07110E] h-1.5 border border-[#1C3A2E]">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-[#35D399] transition-all duration-300"
              style={{ width: `${(timeLeft / 20) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Action Notification Log */}
      {board.lastAction && (
        <div className="rounded-xl border border-[#1C3A2E] bg-[#081310] px-3.5 py-2 text-xs text-[#8FA39A] flex items-center justify-between">
          <span>{board.lastAction}</span>
          {board.extras > 0 && (
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 font-mono-custom text-[10px] font-bold text-amber-400">
              <Zap className="h-3 w-3 fill-current" />
              Extra Turn ({board.extras}/3)
            </span>
          )}
        </div>
      )}

      {/* Waiting for Opponent Box */}
      {match.state === 'open' && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1A180E] to-[#0A1512] p-4 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-amber-400 animate-pulse" />
          <h3 className="text-base font-bold text-[#E8F2EC]">Waiting for Opponent</h3>
          <p className="text-xs text-[#8FA39A] max-w-sm mx-auto">
            Share this link to challenge an opponent or wait for an auto-match.
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 rounded-xl border border-[#35D399] bg-[#122019] px-4 py-2 text-xs font-bold text-[#35D399] transition-all hover:bg-[#35D399]/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Link Copied!' : 'Copy Challenge Link'}
            </button>

            {!isCreator && (
              <button
                type="button"
                onClick={handleAcceptMatch}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-[#35D399] px-4 py-2 text-xs font-bold text-[#062018] transition-all hover:bg-[#35D399]/90"
              >
                Accept Challenge ({match.stake} KTK)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ludo Interactive Visual Board */}
      <div className="relative rounded-3xl border-4 border-[#12241E] bg-[#040A08] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] space-y-4">
        {/* Token Track / Position Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Red Yard & Track */}
          <div className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/20 to-[#07110E] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-red-400">
              <span>RED YARD</span>
              <span>Start: Tile 0 ★</span>
            </div>
            <div className="flex items-center gap-2">
              {board.red.map((token) => (
                <div
                  key={token.id}
                  className={`flex flex-1 flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                    token.pos === 'done'
                      ? 'border-[#35D399] bg-[#35D399]/15 text-[#35D399]'
                      : 'border-red-500/60 bg-red-950/30 text-red-400'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 font-black text-white text-xs shadow-md">
                    R{token.id + 1}
                  </span>
                  <span className="mt-1 font-mono-custom text-[10px]">
                    {token.pos === 'yard' ? 'In Yard' : token.pos === 'done' ? '✓ HOME' : token.pos}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Yellow Yard & Track */}
          <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-950/20 to-[#07110E] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-yellow-400">
              <span>YELLOW YARD</span>
              <span>Start: Tile 26 ★</span>
            </div>
            <div className="flex items-center gap-2">
              {board.yellow.map((token) => (
                <div
                  key={token.id}
                  className={`flex flex-1 flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                    token.pos === 'done'
                      ? 'border-[#35D399] bg-[#35D399]/15 text-[#35D399]'
                      : 'border-yellow-500/60 bg-yellow-950/30 text-yellow-400'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 font-black text-black text-xs shadow-md">
                    Y{token.id + 1}
                  </span>
                  <span className="mt-1 font-mono-custom text-[10px]">
                    {token.pos === 'yard' ? 'In Yard' : token.pos === 'done' ? '✓ HOME' : token.pos}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Central Ludo Action Controls */}
        {match.state === 'live' && (
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#091512] p-4 text-center space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8FA39A]">Active Player:</span>
              <span className={`font-bold font-mono-custom ${isRedTurn ? 'text-red-400' : 'text-yellow-400'}`}>
                {isRedTurn ? 'RED' : 'YELLOW'} ({board.phase === 'await_roll' ? 'Roll Phase' : 'Move Phase'})
              </span>
            </div>

            {/* Die Visualizer */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/30 via-[#1C180A] to-[#0D0B05] text-3xl font-black text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all duration-300 ${
                  rollingAnim ? 'rotate-180 scale-110' : ''
                }`}
              >
                {board.die > 0 ? board.die : '—'}
              </div>
            </div>

            {/* Action Buttons */}
            {board.phase === 'await_roll' && (
              <button
                type="button"
                disabled={busy}
                onClick={handleRoll}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 font-mono-custom text-sm font-bold text-[#062018] shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Dices className={`h-5 w-5 ${rollingAnim ? 'animate-spin' : ''}`} />
                ROLL DICE (Crypto RNG)
              </button>
            )}

            {board.phase === 'await_move' && (
              <div className="space-y-2">
                <div className="text-xs text-[#35D399] font-semibold">
                  Select token to advance {board.die} steps:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((tokenIdx) => {
                    const isLegal = board.legal.includes(tokenIdx);
                    const token = isRedTurn ? board.red[tokenIdx] : board.yellow[tokenIdx];
                    return (
                      <button
                        key={tokenIdx}
                        type="button"
                        disabled={!isLegal || busy}
                        onClick={() => handleMove(tokenIdx as 0 | 1)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-mono-custom text-xs font-bold transition-all ${
                          isLegal
                            ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399] hover:bg-[#35D399]/30 ring-1 ring-[#35D399]/50 animate-pulse'
                            : 'border-[#1C3A2E] bg-[#07110E] text-[#5C7368] cursor-not-allowed opacity-40'
                        }`}
                      >
                        Advance Token {tokenIdx + 1} ({token.pos})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safe Tiles Reference Pill */}
        <div className="rounded-xl border border-[#1C3A2E]/60 bg-[#07110E] p-2.5 text-[11px] text-[#8FA39A]">
          <div className="flex items-center gap-1 text-[#f3d37a] font-semibold">
            <Star className="h-3 w-3 fill-current" />
            <span>Safe Tiles (No Capture): 0 (Red Start), 8, 13, 21, 26 (Yellow Start), 34, 39, 47</span>
          </div>
          <p className="mt-1 text-[10px]">
            Own-stack block: Having both tokens on the same ring tile blocks the opponent from landing or passing!
          </p>
        </div>
      </div>

      {/* Match Resolution Overlay & Rematch */}
      {match.state === 'resolved' && (
        <div className="rounded-2xl border border-[#35D399]/40 bg-gradient-to-br from-[#0E1F18] to-[#07110E] p-5 text-center shadow-[0_8px_32px_rgba(53,211,153,0.15)] space-y-3">
          <Trophy className="mx-auto h-10 w-10 text-amber-400 animate-pulse" />
          <h3 className="text-xl font-black text-[#E8F2EC]">
            {match.winnerId === match.creatorId
              ? `${data?.creatorLegend?.name || 'Red'} Wins!`
              : `${data?.opponentLegend?.name || 'Yellow'} Wins!`}
          </h3>
          <p className="text-xs text-[#8FA39A] font-mono-custom">
            Winner Prize: {match.prize} KTK (4% house rake: {match.rake} KTK)
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRematch}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-[#35D399] px-5 py-2.5 font-mono-custom text-xs font-bold text-[#062018] shadow-md transition-all hover:bg-[#35D399]/90 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              Rematch ({match.stake} KTK)
            </button>
            <button
              type="button"
              onClick={() => setLocation('/pvp')}
              className="rounded-xl border border-[#1C3A2E] bg-[#07110E] px-4 py-2.5 font-mono-custom text-xs text-[#8FA39A] hover:text-[#E8F2EC]"
            >
              Back to PvP
            </button>
          </div>
        </div>
      )}

      {/* Abort Button (active before first move) */}
      {canAbort && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleAbort}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs text-red-400/80 hover:text-red-400 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel & Full Refund (No Moves Made)
          </button>
        </div>
      )}
    </div>
  );
}
