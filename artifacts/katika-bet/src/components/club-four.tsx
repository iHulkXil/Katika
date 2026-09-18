import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  ArrowDown,
  Check,
  CircleDot,
  Clock,
  Copy,
  RotateCcw,
  Share2,
  Shield,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';

interface FourBoard {
  cells: number[];
  moves: number[];
  winningCells?: number[];
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
    board: FourBoard;
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

export function ClubFourPage() {
  const [, params] = useRoute('/club/four/:id');
  const [, setLocation] = useLocation();
  const matchId = params?.id;
  const { session, refresh: refreshSession } = useServerSession();
  const { toast } = useToast();

  const [data, setData] = useState<ClubMatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [droppingCol, setDroppingCol] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);

  const currentUserId = session?.userId ? String(session.userId) : null;
  // Note: in privy session, userId is available or via card/identity
  // We can compare using user identity or checking turn
  const isCreator = data?.match ? Boolean(session?.profileComplete && data.creatorLegend?.name) : false;

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
      // Ignore transient fetch failure
    } finally {
      setLoading(false);
    }
  };

  // Poll every 1s while open or live
  useEffect(() => {
    fetchMatch();
    const interval = setInterval(() => {
      if (data?.match?.state === 'open' || data?.match?.state === 'live') {
        fetchMatch();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [matchId, data?.match?.state]);

  // Turn timer countdown (15s)
  useEffect(() => {
    if (data?.match?.state !== 'live') {
      setTimeLeft(15);
      return;
    }

    const lastTime = data.match.resolvedAt
      ? new Date(data.match.resolvedAt).getTime()
      : new Date(data.match.createdAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTime) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const t = setInterval(updateTimer, 500);
    return () => clearInterval(t);
  }, [data?.match?.resolvedAt, data?.match?.state]);

  const match = data?.match;
  const board = match?.board;
  const cells = board?.cells || new Array(42).fill(0);
  const moves = board?.moves || [];
  const winningCells = board?.winningCells || [];

  // Determine if it's the current user's turn
  // In Club API, turnUserId is the privyUserId of the active player
  const myTurn = match?.state === 'live' && (
    (match.turnUserId === match.creatorId && isCreator) ||
    (match.turnUserId === match.opponentId && !isCreator)
  );

  const handleDrop = async (col: number) => {
    if (!matchId || busy || match?.state !== 'live') return;

    try {
      setBusy(true);
      setDroppingCol(col);

      const res = await fetch(`/api/club/${matchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to drop token');
      }

      setData((prev) => (prev ? { ...prev, match: json.match } : null));
      await refreshSession();
    } catch (err: any) {
      toast({
        title: 'Move Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      setDroppingCol(null);
    }
  };

  const handleAcceptMatch = async () => {
    if (!matchId || busy) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/club/${matchId}/accept`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to accept challenge');
      }
      setData((prev) => (prev ? { ...prev, match: json.match } : null));
      await refreshSession();
      toast({ title: 'Challenge Accepted!', description: 'Match is now live. Red drops first.' });
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
      const res = await fetch(`/api/club/${matchId}/abort`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Cannot abort match');
      }
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
      const res = await fetch(`/api/club/${matchId}/rematch`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Rematch failed');
      }
      await refreshSession();
      setLocation(`/club/four/${json.newMatchId}`);
    } catch (err: any) {
      toast({ title: 'Rematch Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Link Copied', description: 'Share this link with your opponent to play.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-sm text-[#8FA39A]">
          <CircleDot className="h-6 w-6 animate-spin text-[#35D399]" />
          Loading Connect Four match...
        </div>
      </div>
    );
  }

  if (!match) return null;

  const pot = match.stake * 2;
  const rake = Math.floor(pot * 0.04);
  const prize = pot - rake;
  const canAbort = match.state === 'open' || (match.state === 'live' && moves.length === 0);

  // Check which columns are open (row 5 is empty)
  const isColOpen = (col: number) => cells[5 * 7 + col] === 0;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-12">
      {/* Top Match Bar */}
      <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1512] p-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1C3A2E]/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400 ring-1 ring-red-500/40">
              <CircleDot className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#E8F2EC]">Connect Four (7×6)</h2>
              <div className="text-[11px] text-[#8FA39A]">
                Stake: {match.stake} KTK · Pot: {pot} KTK · Prize: {prize} KTK
              </div>
            </div>
          </div>

          {/* State Badge */}
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
          {/* Player 1 (Red / Creator) */}
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              match.turnUserId === match.creatorId && match.state === 'live'
                ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'border-[#1C3A2E] bg-[#07110E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="font-bold text-[#E8F2EC]">
                  {data?.creatorLegend?.name || 'Player 1'}
                </span>
              </div>
              <span className="font-mono-custom text-[10px] text-red-400 font-bold">RED (1st)</span>
            </div>
            <div className="mt-1 text-[11px] text-[#8FA39A]">
              {match.turnUserId === match.creatorId && match.state === 'live'
                ? 'Thinking (Drop turn)...'
                : match.winnerId === match.creatorId
                ? '🏆 Winner!'
                : 'Waiting'}
            </div>
          </div>

          {/* Player 2 (Yellow / Opponent) */}
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              match.turnUserId === match.opponentId && match.state === 'live'
                ? 'border-yellow-400 bg-yellow-950/20 ring-1 ring-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'border-[#1C3A2E] bg-[#07110E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                <span className="font-bold text-[#E8F2EC]">
                  {data?.opponentLegend?.name || (match.opponentId ? 'Player 2' : 'Open Seat')}
                </span>
              </div>
              <span className="font-mono-custom text-[10px] text-yellow-400 font-bold">YELLOW</span>
            </div>
            <div className="mt-1 text-[11px] text-[#8FA39A]">
              {!match.opponentId
                ? 'Awaiting player'
                : match.turnUserId === match.opponentId && match.state === 'live'
                ? 'Thinking (Drop turn)...'
                : match.winnerId === match.opponentId
                ? '🏆 Winner!'
                : 'Waiting'}
            </div>
          </div>
        </div>

        {/* 15s Timer Bar */}
        {match.state === 'live' && (
          <div className="mt-3 overflow-hidden rounded-full bg-[#07110E] h-1.5 border border-[#1C3A2E]">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-[#35D399] transition-all duration-300"
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Open Match Waiting Card */}
      {match.state === 'open' && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1A180E] to-[#0A1512] p-4 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-amber-400 animate-pulse" />
          <h3 className="text-base font-bold text-[#E8F2EC]">Waiting for Opponent</h3>
          <p className="text-xs text-[#8FA39A] max-w-sm mx-auto">
            Share this match link with a friend or wait for a queue match. Anyone with the link can join!
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

            {/* If spectator or different user, allow Join */}
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

      {/* Connect Four 7x6 Board */}
      <div className="rounded-3xl border-4 border-[#12241E] bg-gradient-to-b from-[#0A1A14] to-[#050E0B] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {/* Column Drop Buttons (Top) */}
        <div className="grid grid-cols-7 gap-2 pb-3">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => {
            const open = isColOpen(col);
            const canDrop = match.state === 'live' && open && !busy;
            return (
              <button
                key={col}
                type="button"
                disabled={!canDrop}
                onClick={() => handleDrop(col)}
                className={`group flex h-10 flex-col items-center justify-center rounded-xl border transition-all ${
                  canDrop
                    ? 'border-[#1C3A2E] bg-[#0D1C16] text-[#35D399] hover:border-[#35D399] hover:bg-[#35D399]/20 hover:scale-105 active:scale-95'
                    : 'border-transparent bg-transparent text-[#264034] opacity-30 cursor-not-allowed'
                }`}
              >
                <ArrowDown className={`h-4 w-4 ${canDrop ? 'group-hover:translate-y-0.5 transition-transform' : ''}`} />
                <span className="font-mono-custom text-[9px]">Col {col + 1}</span>
              </button>
            );
          })}
        </div>

        {/* 7x6 Matrix */}
        {/* Rows rendered from 5 (top) down to 0 (bottom) */}
        <div className="grid grid-rows-6 gap-2 rounded-2xl bg-[#030907] p-3 border border-[#142A20]">
          {[5, 4, 3, 2, 1, 0].map((row) => (
            <div key={row} className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                const cellIndex = row * 7 + col;
                const value = cells[cellIndex];
                const isWinning = winningCells.includes(cellIndex);

                return (
                  <div
                    key={col}
                    onClick={() => {
                      if (isColOpen(col) && match.state === 'live') {
                        handleDrop(col);
                      }
                    }}
                    className={`relative flex aspect-square items-center justify-center rounded-full border transition-all duration-300 ${
                      value === 0
                        ? 'border-[#11241C] bg-[#06120D] hover:border-[#35D399]/30'
                        : value === 1
                        ? 'border-red-600 bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                        : 'border-yellow-500 bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                    } ${isWinning ? 'ring-4 ring-amber-300 animate-bounce shadow-[0_0_24px_rgba(252,211,77,0.9)]' : ''}`}
                  >
                    {/* Inner 3D Token Ring */}
                    {value !== 0 && (
                      <div className="h-3/4 w-3/4 rounded-full border border-white/40 bg-white/10" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Match Resolution Overlay & Rematch */}
      {match.state === 'resolved' && (
        <div className="rounded-2xl border border-[#35D399]/40 bg-gradient-to-br from-[#0E1F18] to-[#07110E] p-5 text-center shadow-[0_8px_32px_rgba(53,211,153,0.15)] space-y-3">
          <Trophy className="mx-auto h-10 w-10 text-amber-400 animate-pulse" />
          <h3 className="text-xl font-black text-[#E8F2EC]">
            {match.winnerId
              ? match.winnerId === match.creatorId
                ? `${data?.creatorLegend?.name || 'Red'} Wins!`
                : `${data?.opponentLegend?.name || 'Yellow'} Wins!`
              : 'Match Drawn! Full Refund'}
          </h3>
          <p className="text-xs text-[#8FA39A] font-mono-custom">
            {match.winnerId ? `Winner Prize: ${match.prize} KTK (4% house rake: ${match.rake} KTK)` : 'Board full with no four in a row. Stakes returned.'}
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
              onClick={() => setLocation('/club')}
              className="rounded-xl border border-[#1C3A2E] bg-[#07110E] px-4 py-2.5 font-mono-custom text-xs text-[#8FA39A] hover:text-[#E8F2EC]"
            >
              Back to Club
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
