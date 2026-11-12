import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Coins,
  ShieldCheck,
  Trophy,
  Dices,
  Zap,
  Users,
  Star,
  Swords,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CRYPTO_RATES: Record<string, number> = {
  SOL: 148.5,
  ETH: 3233.0,
  BTC: 91420.0,
  USDT: 1.0,
};

type CryptoType = 'SOL' | 'ETH' | 'BTC' | 'USDT';

interface LudoToken {
  id: 0 | 1;
  // "yard" | "track:X" (0..51) | "home:Y" (1..5) | "done"
  pos: string;
}

const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];
const RED_START = 0;
const RED_HOME_ENTRY = 50;
const YELLOW_START = 26;
const YELLOW_HOME_ENTRY = 24;

const OPPONENTS = [
  { name: 'Chinedu (SOL Whale)', avatar: '/assets/images/avatar_crypto_trader_1794496493828.jpg', skill: 'Aggressive' },
  { name: 'Adaeze (Top Bull)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', skill: 'Tactical' },
  { name: 'Kofi Alpha', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', skill: 'Defensive' },
];

export function LudoGamePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
  const [stakeUsd, setStakeUsd] = useState<number>(25);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    return Number(localStorage.getItem('sidebet_wallet_balance') || '4011');
  });

  const [activeOpponent] = useState(() => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]);

  // Game state
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [turn, setTurn] = useState<'red' | 'yellow'>('red'); // Red = User, Yellow = Opponent
  const [phase, setPhase] = useState<'await_roll' | 'await_move'>('await_roll');
  const [die, setDie] = useState<number>(0);
  const [rollingAnim, setRollingAnim] = useState<boolean>(false);
  const [redTokens, setRedTokens] = useState<[LudoToken, LudoToken]>([
    { id: 0, pos: 'yard' },
    { id: 1, pos: 'yard' },
  ]);
  const [yellowTokens, setYellowTokens] = useState<[LudoToken, LudoToken]>([
    { id: 0, pos: 'yard' },
    { id: 1, pos: 'yard' },
  ]);
  const [lastAction, setLastAction] = useState<string>('Game ready. Roll a 6 to enter track!');
  const [winner, setWinner] = useState<'red' | 'yellow' | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const cryptoEquivalent = (stakeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2
  );
  const totalPot = stakeUsd * 2;
  const prizeUsd = totalPot * 0.96;

  // Sound generator
  const playSound = useCallback((type: 'roll' | 'step' | 'capture' | 'win') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      if (type === 'roll') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'capture') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
        });
      }
    } catch {}
  }, [soundEnabled]);

  // Start game
  const handleStartGame = () => {
    if (walletBalance < stakeUsd) {
      toast({
        title: 'Insufficient Balance',
        description: `Deposit more crypto to stake $${stakeUsd}.00 into Ludo Quick.`,
        variant: 'destructive',
      });
      return;
    }

    const newBal = walletBalance - stakeUsd;
    setWalletBalance(newBal);
    localStorage.setItem('sidebet_wallet_balance', newBal.toFixed(2));

    setRedTokens([
      { id: 0, pos: 'yard' },
      { id: 1, pos: 'yard' },
    ]);
    setYellowTokens([
      { id: 0, pos: 'yard' },
      { id: 1, pos: 'yard' },
    ]);
    setTurn('red');
    setPhase('await_roll');
    setDie(0);
    setWinner(null);
    setGameState('playing');
    setLastAction('Match started! You are RED. Roll the dice!');
  };

  // Determine legal moves for current player
  const getLegalMoves = useCallback((player: 'red' | 'yellow', rollValue: number): number[] => {
    const tokens = player === 'red' ? redTokens : yellowTokens;
    const legals: number[] = [];

    tokens.forEach((t) => {
      if (t.pos === 'done') return;

      if (t.pos === 'yard') {
        if (rollValue === 6) legals.push(t.id);
      } else if (t.pos.startsWith('track:')) {
        legals.push(t.id);
      } else if (t.pos.startsWith('home:')) {
        const step = parseInt(t.pos.split(':')[1], 10);
        if (step + rollValue <= 6) {
          legals.push(t.id);
        }
      }
    });

    return legals;
  }, [redTokens, yellowTokens]);

  // Execute Token Move
  const executeMove = useCallback((player: 'red' | 'yellow', tokenId: 0 | 1, rollValue: number) => {
    let captured = false;

    if (player === 'red') {
      const copy = [...redTokens] as [LudoToken, LudoToken];
      const token = copy[tokenId];

      if (token.pos === 'yard') {
        token.pos = `track:${RED_START}`;
        setLastAction(`You rolled 6! Red Token ${tokenId + 1} enters track.`);
        playSound('step');
      } else if (token.pos.startsWith('track:')) {
        const currentTile = parseInt(token.pos.split(':')[1], 10);
        const distFromStart = (currentTile - RED_START + 52) % 52;

        if (distFromStart + rollValue >= 51) {
          // Enter Home column
          const homeStep = (distFromStart + rollValue) - 50;
          if (homeStep >= 6) {
            token.pos = 'done';
            setLastAction(`🎉 Red Token ${tokenId + 1} reached HOME!`);
            playSound('win');
          } else {
            token.pos = `home:${homeStep}`;
            setLastAction(`Red Token ${tokenId + 1} entered home column (${homeStep}/6).`);
            playSound('step');
          }
        } else {
          const nextTile = (currentTile + rollValue) % 52;
          token.pos = `track:${nextTile}`;
          playSound('step');

          // Check Capture on Yellow
          if (!SAFE_TILES.includes(nextTile)) {
            const yellowCopy = [...yellowTokens] as [LudoToken, LudoToken];
            yellowCopy.forEach((yt) => {
              if (yt.pos === `track:${nextTile}`) {
                yt.pos = 'yard';
                captured = true;
                playSound('capture');
                setLastAction(`💥 BOOM! You captured Yellow Token ${yt.id + 1}! Extra roll!`);
              }
            });
            if (captured) setYellowTokens(yellowCopy);
          }

          if (!captured) {
            setLastAction(`Red Token ${tokenId + 1} advanced ${rollValue} steps to Tile ${nextTile}.`);
          }
        }
      } else if (token.pos.startsWith('home:')) {
        const step = parseInt(token.pos.split(':')[1], 10);
        const nextStep = step + rollValue;
        if (nextStep === 6) {
          token.pos = 'done';
          setLastAction(`🎉 Red Token ${tokenId + 1} reached HOME!`);
          playSound('win');
        } else if (nextStep < 6) {
          token.pos = `home:${nextStep}`;
          setLastAction(`Red Token ${tokenId + 1} advanced in home column (${nextStep}/6).`);
          playSound('step');
        }
      }

      setRedTokens(copy);

      // Check Win Condition
      if (copy.every((t) => t.pos === 'done')) {
        setWinner('red');
        setGameState('gameover');
        playSound('win');

        const wonBal = walletBalance + prizeUsd;
        setWalletBalance(wonBal);
        localStorage.setItem('sidebet_wallet_balance', wonBal.toFixed(2));

        toast({
          title: '🏆 VICTORY! YOU WON LUDO!',
          description: `+$${prizeUsd.toFixed(2)} (${(prizeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(2)} ${selectedCrypto}) credited to your balance!`,
        });
        return;
      }
    } else {
      // Yellow Player (Opponent)
      const copy = [...yellowTokens] as [LudoToken, LudoToken];
      const token = copy[tokenId];

      if (token.pos === 'yard') {
        token.pos = `track:${YELLOW_START}`;
        setLastAction(`${activeOpponent.name} rolled 6! Entered track.`);
        playSound('step');
      } else if (token.pos.startsWith('track:')) {
        const currentTile = parseInt(token.pos.split(':')[1], 10);
        const distFromStart = (currentTile - YELLOW_START + 52) % 52;

        if (distFromStart + rollValue >= 51) {
          const homeStep = (distFromStart + rollValue) - 50;
          if (homeStep >= 6) {
            token.pos = 'done';
            setLastAction(`${activeOpponent.name} brought Token ${tokenId + 1} HOME!`);
          } else {
            token.pos = `home:${homeStep}`;
            setLastAction(`${activeOpponent.name} entered home column.`);
          }
        } else {
          const nextTile = (currentTile + rollValue) % 52;
          token.pos = `track:${nextTile}`;
          playSound('step');

          // Check Capture on Red
          if (!SAFE_TILES.includes(nextTile)) {
            const redCopy = [...redTokens] as [LudoToken, LudoToken];
            redCopy.forEach((rt) => {
              if (rt.pos === `track:${nextTile}`) {
                rt.pos = 'yard';
                captured = true;
                playSound('capture');
                setLastAction(`⚠️ ${activeOpponent.name} captured your Red Token ${rt.id + 1}!`);
              }
            });
            if (captured) setRedTokens(redCopy);
          }
        }
      } else if (token.pos.startsWith('home:')) {
        const step = parseInt(token.pos.split(':')[1], 10);
        const nextStep = step + rollValue;
        if (nextStep === 6) {
          token.pos = 'done';
          setLastAction(`${activeOpponent.name} brought Token ${tokenId + 1} HOME!`);
        } else if (nextStep < 6) {
          token.pos = `home:${nextStep}`;
        }
      }

      setYellowTokens(copy);

      // Check Win Condition
      if (copy.every((t) => t.pos === 'done')) {
        setWinner('yellow');
        setGameState('gameover');
        toast({
          title: 'Defeat',
          description: `${activeOpponent.name} won this match. Rematch for revenge!`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Turn Handover: 6 or capture gives an extra turn!
    if (rollValue === 6 || captured) {
      setPhase('await_roll');
      setDie(0);
      setLastAction((prev) => `${prev} Extra roll granted!`);
    } else {
      setTurn(player === 'red' ? 'yellow' : 'red');
      setPhase('await_roll');
      setDie(0);
    }
  }, [redTokens, yellowTokens, playSound, walletBalance, prizeUsd, selectedCrypto, toast, activeOpponent.name]);

  // Roll Dice Action
  const handleRoll = () => {
    if (phase !== 'await_roll' || rollingAnim || turn !== 'red') return;

    setRollingAnim(true);
    playSound('roll');

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDie(roll);
      setRollingAnim(false);

      const legals = getLegalMoves('red', roll);

      if (legals.length === 0) {
        setLastAction(`You rolled a ${roll}. No legal moves! Opponent's turn.`);
        setTimeout(() => {
          setTurn('yellow');
          setPhase('await_roll');
          setDie(0);
        }, 1200);
      } else if (legals.length === 1) {
        // Auto-move single legal token
        setPhase('await_move');
        setTimeout(() => {
          executeMove('red', legals[0] as 0 | 1, roll);
        }, 400);
      } else {
        setPhase('await_move');
        setLastAction(`You rolled a ${roll}! Select which token to advance.`);
      }
    }, 450);
  };

  // Bot Turn Simulation
  useEffect(() => {
    if (gameState !== 'playing' || turn !== 'yellow' || phase !== 'await_roll') return;

    const botTimer = setTimeout(() => {
      // Bot rolls
      playSound('roll');
      const roll = Math.floor(Math.random() * 6) + 1;
      setDie(roll);

      setTimeout(() => {
        const legals = getLegalMoves('yellow', roll);

        if (legals.length === 0) {
          setLastAction(`${activeOpponent.name} rolled a ${roll}. No legal moves! Your turn.`);
          setTimeout(() => {
            setTurn('red');
            setPhase('await_roll');
            setDie(0);
          }, 1000);
        } else {
          // Bot picks best move (e.g. exit yard on 6 or advance furthest)
          const chosenTokenId = legals.includes(0) && yellowTokens[0].pos === 'yard' && roll === 6
            ? 0
            : legals[legals.length - 1];

          executeMove('yellow', chosenTokenId as 0 | 1, roll);
        }
      }, 700);
    }, 1100);

    return () => clearTimeout(botTimer);
  }, [gameState, turn, phase, activeOpponent.name, getLegalMoves, executeMove, yellowTokens, playSound]);

  const legalMovesForRed = phase === 'await_move' && turn === 'red' ? getLegalMoves('red', die) : [];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pvp"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#FACC15] font-bold">
                PVP ARENA
              </span>
              <span className="rounded-full bg-[#A855F7]/20 border border-[#A855F7]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#C084FC]">
                LUDO SPRINT
              </span>
            </div>
            <h1 className="text-2xl font-extrabold font-display text-white">Ludo Quick (2-Token Race)</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 size={16} className="text-[#4ADE80]" /> : <VolumeX size={16} />}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-[#0F1713] px-4 py-2 font-mono text-xs">
            <span className="text-slate-400">Balance:</span>
            <span className="text-[#4ADE80] font-black">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      {gameState === 'lobby' ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#FACC15] font-bold uppercase tracking-wider">Fast Board Dash</span>
              <h2 className="text-2xl font-extrabold text-white">2-Token Ludo Sprint Match</h2>
              <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                Classic West African Ludo rules. Roll a 6 to enter the track, capture your opponent's tokens to send them back to the yard, and sprint your 2 tokens into HOME first to take the whole prize pot!
              </p>
            </div>

            <div className="flex items-center gap-4 bg-[#121820] border border-white/5 p-4 rounded-3xl">
              <div className="h-14 w-14 rounded-2xl overflow-hidden border border-white/10">
                <img src={activeOpponent.avatar} alt={activeOpponent.name} className="h-full w-full object-cover" />
              </div>
              <div className="text-left font-mono text-xs">
                <span className="text-[10px] text-[#FACC15] uppercase block">Matched Contender</span>
                <span className="text-white font-bold block">{activeOpponent.name}</span>
                <span className="text-slate-400 text-[10px]">{activeOpponent.skill} Playstyle</span>
              </div>
            </div>
          </div>

          {/* Crypto Wager Selector */}
          <div className="border-t border-white/5 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Choose Wager Currency & Stake</span>
              <div className="flex items-center gap-1 bg-[#121820] p-1 rounded-xl border border-white/5">
                {(['SOL', 'ETH', 'BTC', 'USDT'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCrypto(curr)}
                    className={`rounded-lg px-3 py-1 text-xs font-mono font-bold transition-all ${
                      selectedCrypto === curr
                        ? 'bg-[#22C55E] text-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStakeUsd(val)}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    stakeUsd === val
                      ? 'border-[#22C55E] bg-[#121B16] text-[#4ADE80] ring-1 ring-[#22C55E]/40'
                      : 'border-white/[0.08] bg-[#121820] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-base font-black font-mono block">${val}.00</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(val / CRYPTO_RATES[selectedCrypto]).toFixed(selectedCrypto === 'BTC' ? 5 : 2)} {selectedCrypto}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">Match Prize Pot:</span>
                <span className="text-lg font-black text-[#FACC15]">${prizeUsd.toFixed(2)}</span>
                <span className="text-slate-500">(4% house rake)</span>
              </div>

              <button
                type="button"
                onClick={handleStartGame}
                className="w-full sm:w-auto rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-8 py-3.5 text-xs font-black text-black shadow-lg shadow-[#22C55E]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                PLAY LUDO MATCH ({cryptoEquivalent} {selectedCrypto})
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Match HUD Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Red Player (User) */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                turn === 'red'
                  ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'border-white/5 bg-[#0E1318]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
                  <span className="font-bold text-sm text-white">You (RED)</span>
                </div>
                <span className="text-[10px] font-mono text-red-400 font-bold">Start: Tile 0 ★</span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-300 space-y-0.5">
                <div>Token 1: <strong className="text-white">{redTokens[0].pos}</strong></div>
                <div>Token 2: <strong className="text-white">{redTokens[1].pos}</strong></div>
              </div>
            </div>

            {/* Central Dice & Turn Indicator */}
            <div className="rounded-2xl border border-white/10 bg-[#0E1318] p-4 text-center flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {turn === 'red' ? '👉 YOUR TURN' : `⏳ ${activeOpponent.name.toUpperCase()}'S TURN`}
              </span>

              {/* 3D Styled Dice */}
              <div
                onClick={turn === 'red' && phase === 'await_roll' ? handleRoll : undefined}
                className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black font-mono shadow-2xl transition-all cursor-pointer ${
                  turn === 'red' && phase === 'await_roll'
                    ? 'border-[#22C55E] bg-[#121B16] text-[#4ADE80] animate-pulse hover:scale-105'
                    : 'border-white/20 bg-[#121820] text-white'
                } ${rollingAnim ? 'rotate-180 scale-110' : ''}`}
              >
                {die > 0 ? die : <Dices size={28} className={rollingAnim ? 'animate-spin' : ''} />}
              </div>

              {turn === 'red' && phase === 'await_roll' && (
                <button
                  type="button"
                  onClick={handleRoll}
                  className="rounded-xl bg-[#22C55E] px-4 py-1 text-[11px] font-bold text-black shadow-md shadow-[#22C55E]/20"
                >
                  ROLL DICE
                </button>
              )}
            </div>

            {/* Yellow Player (Opponent) */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                turn === 'yellow'
                  ? 'border-yellow-400 bg-yellow-950/20 ring-1 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                  : 'border-white/5 bg-[#0E1318]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#FACC15]" />
                  <span className="font-bold text-sm text-white">{activeOpponent.name}</span>
                </div>
                <span className="text-[10px] font-mono text-yellow-400 font-bold">Start: Tile 26 ★</span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-300 space-y-0.5">
                <div>Token 1: <strong className="text-white">{yellowTokens[0].pos}</strong></div>
                <div>Token 2: <strong className="text-white">{yellowTokens[1].pos}</strong></div>
              </div>
            </div>
          </div>

          {/* Action Log Banner */}
          <div className="rounded-2xl border border-white/5 bg-[#121820] px-4 py-2.5 text-xs font-mono text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap size={14} className="text-[#FACC15]" />
              <span>{lastAction}</span>
            </span>
            <span className="text-slate-500 text-[10px]">Pot: ${prizeUsd.toFixed(2)}</span>
          </div>

          {/* Interactive Token Action Controls */}
          {phase === 'await_move' && turn === 'red' && (
            <div className="rounded-2xl border border-[#22C55E]/40 bg-[#121B16] p-4 text-center space-y-3 animate-in fade-in">
              <span className="text-xs font-bold text-[#4ADE80]">
                Choose which token to move {die} steps:
              </span>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {[0, 1].map((tokenId) => {
                  const isLegal = legalMovesForRed.includes(tokenId);
                  const token = redTokens[tokenId];

                  return (
                    <button
                      key={tokenId}
                      type="button"
                      disabled={!isLegal}
                      onClick={() => executeMove('red', tokenId as 0 | 1, die)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold font-mono transition-all ${
                        isLegal
                          ? 'border-[#22C55E] bg-[#22C55E] text-black shadow-lg shadow-[#22C55E]/20 hover:scale-105 active:scale-95 animate-pulse'
                          : 'border-white/5 bg-[#080C0F] text-slate-600 cursor-not-allowed opacity-40'
                      }`}
                    >
                      Advance Token {tokenId + 1} ({token.pos})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Board Overview Track */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#080C0F] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Perimeter Track (52 Tiles)</span>
              <span className="flex items-center gap-1 text-[#FACC15]">
                <Star size={12} className="fill-current" />
                <span>Safe Tiles: 0, 8, 13, 21, 26, 34, 39, 47</span>
              </span>
            </div>

            {/* Visual Token Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-3 text-center">
                <span className="text-[10px] font-mono text-red-400 block font-bold">RED TOKEN 1</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {redTokens[0].pos === 'done' ? '✓ HOME' : redTokens[0].pos}
                </span>
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-3 text-center">
                <span className="text-[10px] font-mono text-red-400 block font-bold">RED TOKEN 2</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {redTokens[1].pos === 'done' ? '✓ HOME' : redTokens[1].pos}
                </span>
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/10 p-3 text-center">
                <span className="text-[10px] font-mono text-yellow-400 block font-bold">YELLOW TOKEN 1</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {yellowTokens[0].pos === 'done' ? '✓ HOME' : yellowTokens[0].pos}
                </span>
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/10 p-3 text-center">
                <span className="text-[10px] font-mono text-yellow-400 block font-bold">YELLOW TOKEN 2</span>
                <span className="text-lg font-black text-white mt-1 block">
                  {yellowTokens[1].pos === 'done' ? '✓ HOME' : yellowTokens[1].pos}
                </span>
              </div>
            </div>
          </div>

          {/* Winner Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="rounded-3xl border border-[#FACC15]/40 bg-[#17160F] p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95">
              <Trophy size={40} className="mx-auto text-[#FACC15] animate-bounce" />
              <div>
                <h3 className="text-2xl font-black text-white">
                  {winner === 'red' ? '🏆 YOU WON THE MATCH!' : `DEFEAT — ${activeOpponent.name.toUpperCase()} WON!`}
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  Prize Pot: ${prizeUsd.toFixed(2)} ({cryptoEquivalent} {selectedCrypto})
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-6 py-3 text-xs font-bold text-black shadow-lg"
                >
                  Play Rematch (${stakeUsd})
                </button>
                <button
                  type="button"
                  onClick={() => setGameState('lobby')}
                  className="rounded-2xl border border-white/10 bg-[#121820] px-5 py-3 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Change Stakes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
