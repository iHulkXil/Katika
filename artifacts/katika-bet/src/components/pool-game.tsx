import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Swords,
  Coins,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  HelpCircle,
  Play,
  Users,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { useUserAvatar } from '@/lib/avatar';
import { getWalletBalance, setWalletBalance } from '@/lib/balance';
import { useKyc } from '@/lib/kyc';
import { pushNotification } from '@/lib/notifications';

// Crypto Exchange Rates to $ USD
const CRYPTO_RATES = {
  SOL: 148.5,
  ETH: 3233.0,
  BTC: 91420.0,
  USDT: 1.0,
};

type CryptoType = 'SOL' | 'ETH' | 'BTC' | 'USDT';

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'cue' | 'eight' | 'solid' | 'stripe';
  color: string;
  number: number;
  inPocket: boolean;
};

const TABLE_WIDTH = 760;
const TABLE_HEIGHT = 380;
const BALL_RADIUS = 10;
const CUSHION_WIDTH = 28;
const POCKET_RADIUS = 19;

// 6 Pockets Coordinates
const POCKETS = [
  { x: CUSHION_WIDTH, y: CUSHION_WIDTH }, // Top-Left
  { x: TABLE_WIDTH / 2, y: CUSHION_WIDTH - 4 }, // Top-Mid
  { x: TABLE_WIDTH - CUSHION_WIDTH, y: CUSHION_WIDTH }, // Top-Right
  { x: CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, // Bottom-Left
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION_WIDTH + 4 }, // Bottom-Mid
  { x: TABLE_WIDTH - CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, // Bottom-Right
];

const BALL_COLORS: Record<number, string> = {
  1: '#FACC15', // Yellow
  2: '#3B82F6', // Blue
  3: '#EF4444', // Red
  4: '#A855F7', // Purple
  5: '#F97316', // Orange
  6: '#22C55E', // Green
  7: '#991B1B', // Maroon
  8: '#111827', // Black 8-Ball
  9: '#FACC15', // Yellow Stripe
  10: '#3B82F6', // Blue Stripe
  11: '#EF4444', // Red Stripe
  12: '#A855F7', // Purple Stripe
  13: '#F97316', // Orange Stripe
  14: '#22C55E', // Green Stripe
  15: '#991B1B', // Maroon Stripe
};

export function PoolGamePage() {
  const [, setLocation] = useLocation();
  const { user, getAccessToken } = usePrivy();
  const { recordGamePlay } = useKyc();
  const { toast } = useToast();
  const { avatarUrl } = useUserAvatar();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Wagering & Crypto Settings
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
  const [stakeUsd, setStakeUsd] = useState<number>(10);
  const [gameMode, setGameMode] = useState<'pvp' | 'practice'>('pvp');
  const [matchStarted, setMatchStarted] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  const matchSettledRef = useRef(false);
  const matchKeyRef = useRef(`pool-${Date.now()}`);
  const matchStartedRef = useRef(matchStarted);
  const gameModeRef = useRef(gameMode);
  const prizeUsdRef = useRef(0);
  const stakeUsdRef = useRef(stakeUsd);
  const selectedCryptoRef = useRef(selectedCrypto);
  const cryptoAmountRef = useRef('0');

  useEffect(() => { matchStartedRef.current = matchStarted; }, [matchStarted]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { stakeUsdRef.current = stakeUsd; }, [stakeUsd]);
  useEffect(() => { selectedCryptoRef.current = selectedCrypto; }, [selectedCrypto]);

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game Play State
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1');
  const [player1Group, setPlayer1Group] = useState<'solid' | 'stripe' | null>(null);
  const [player2Group, setPlayer2Group] = useState<'solid' | 'stripe' | null>(null);
  const [isAiming, setIsAiming] = useState<boolean>(true);
  const [power, setPower] = useState<number>(45);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [foulMessage, setFoulMessage] = useState<string | null>(null);

  const turnRef = useRef(turn);
  const player1GroupRef = useRef(player1Group);
  const isAimingRef = useRef(isAiming);
  const powerRef = useRef(power);
  const aimAngleRef = useRef(aimAngle);
  const matchWinnerRef = useRef(matchWinner);
  const userIdRef = useRef(user?.id);

  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { player1GroupRef.current = player1Group; }, [player1Group]);
  useEffect(() => { isAimingRef.current = isAiming; }, [isAiming]);
  useEffect(() => { powerRef.current = power; }, [power]);
  useEffect(() => { aimAngleRef.current = aimAngle; }, [aimAngle]);
  useEffect(() => { matchWinnerRef.current = matchWinner; }, [matchWinner]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  // Opponent Details
  const opponent = useMemo(() => ({
    name: 'Kofi Alpha (SOL)',
    avatar: '/assets/images/avatar_crypto_trader_1794496493828.jpg',
    rank: 'Top 5 PvP Master',
  }), []);

  // Web Audio Ball Sound Synthesizer
  const playSound = useCallback((type: 'hit' | 'pocket' | 'cushion') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hit') {
        osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'cushion') {
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'pocket') {
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Crypto conversion calculations
  const safeStakeUsd = Number.isFinite(stakeUsd) && stakeUsd > 0 ? stakeUsd : 0;
  const cryptoAmount = (safeStakeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 6 : selectedCrypto === 'ETH' ? 4 : 2
  );
  const prizeUsd = gameMode === 'pvp' ? safeStakeUsd * 2 * 0.96 : 0; // 4% rake in PvP
  const prizeCrypto = (prizeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 6 : selectedCrypto === 'ETH' ? 4 : 2
  );

  useEffect(() => { prizeUsdRef.current = prizeUsd; }, [prizeUsd]);
  useEffect(() => { cryptoAmountRef.current = cryptoAmount; }, [cryptoAmount]);

  // Initialize Billiard Balls in Rack
  const initBalls = useCallback((): Ball[] => {
    const list: Ball[] = [];

    // Cue Ball (white)
    list.push({
      id: 0,
      x: 200,
      y: TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      type: 'cue',
      color: '#FFFFFF',
      number: 0,
      inPocket: false,
    });

    // 15 Object Balls in Triangle Rack on Right Side
    const rackStartX = 540;
    const rackStartY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2 + 0.8;

    const ballSequence = [
      { num: 1, type: 'solid' },
      { num: 9, type: 'stripe' },
      { num: 2, type: 'solid' },
      { num: 8, type: 'eight' }, // 8-ball in center
      { num: 10, type: 'stripe' },
      { num: 3, type: 'solid' },
      { num: 11, type: 'stripe' },
      { num: 7, type: 'solid' },
      { num: 14, type: 'stripe' },
      { num: 4, type: 'solid' },
      { num: 5, type: 'solid' },
      { num: 13, type: 'stripe' },
      { num: 15, type: 'stripe' },
      { num: 6, type: 'solid' },
      { num: 12, type: 'stripe' },
    ] as const;

    let index = 0;
    for (let row = 0; row < 5; row++) {
      const count = row + 1;
      const x = rackStartX + row * (spacing * 0.866);
      const startY = rackStartY - ((count - 1) * spacing) / 2;

      for (let c = 0; c < count; c++) {
        if (index >= ballSequence.length) break;
        const info = ballSequence[index];
        list.push({
          id: info.num,
          x,
          y: startY + c * spacing,
          vx: 0,
          vy: 0,
          type: info.type,
          color: BALL_COLORS[info.num],
          number: info.num,
          inPocket: false,
        });
        index++;
      }
    }

    return list;
  }, []);

  const ballsRef = useRef<Ball[]>(initBalls());

  // Restart / Reset
  const handleReset = () => {
    ballsRef.current = initBalls();
    matchSettledRef.current = false;
    isAimingRef.current = true;
    turnRef.current = 'player1';
    player1GroupRef.current = null;
    matchWinnerRef.current = null;
    setIsAiming(true);
    setTurn('player1');
    setPlayer1Group(null);
    setPlayer2Group(null);
    setMatchWinner(null);
    setFoulMessage(null);
  };

  // Start Wager or Free Practice Match
  const handleStartMatch = () => {
    if (gameMode === 'practice') {
      matchKeyRef.current = `pool-practice-${Date.now()}`;
      setMatchStarted(true);
      handleReset();
      void recordGamePlay('8-Ball Pool (Free Practice)');
      toast({
        title: 'Free Practice Table Active',
        description: 'Rack is ready! Play solo at $0 stake — eligible for Airtel 200MB game play.',
      });
      return;
    }

    if (safeStakeUsd <= 0) {
      toast({
        title: 'Invalid Stake',
        description: 'Enter a stake amount greater than $0.',
        variant: 'destructive',
      });
      return;
    }

    // Check balance for PvP Stake
    const currentBal = getWalletBalance(user?.id);
    if (currentBal < safeStakeUsd) {
      toast({
        title: 'Insufficient Balance',
        description: `You need at least $${safeStakeUsd} (${cryptoAmount} ${selectedCrypto}) to enter this PvP table, or switch to Free Practice ($0).`,
        variant: 'destructive',
      });
      return;
    }

    // Deduct stake from wallet balance
    setWalletBalance(user?.id, currentBal - safeStakeUsd);
    matchKeyRef.current = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMatchStarted(true);
    handleReset();
    void recordGamePlay('8-Ball Pool');

    toast({
      title: 'PvP Match Started',
      description: `Wagered ${cryptoAmount} ${selectedCrypto} ($${safeStakeUsd}). Match settles automatically when the 8-ball drops.`,
    });
  };

  // Turn Action & Strike Impulse
  const handleShoot = useCallback((overrideAngle?: number, overridePower?: number) => {
    if (!isAimingRef.current || matchWinnerRef.current) return;

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall || cueBall.inPocket) return;

    // Impulse magnitude based on power slider (or bot override)
    const activePower = overridePower ?? powerRef.current;
    const activeAngle = overrideAngle ?? aimAngleRef.current;
    const force = (activePower / 100) * 16;
    cueBall.vx = Math.cos(activeAngle) * force;
    cueBall.vy = Math.sin(activeAngle) * force;

    isAimingRef.current = false;
    setIsAiming(false);
    playSound('hit');
  }, [playSound]);

  // Physics Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updatePhysics = () => {
      const balls = ballsRef.current;
      let anyMoving = false;
      const friction = 0.985;

      // 1. Move balls and check cushion bounds
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.inPocket) continue;

        b.x += b.vx;
        b.y += b.vy;
        b.vx *= friction;
        b.vy *= friction;

        if (Math.abs(b.vx) < 0.03) b.vx = 0;
        if (Math.abs(b.vy) < 0.03) b.vy = 0;

        if (b.vx !== 0 || b.vy !== 0) anyMoving = true;

        // Cushion Boundaries
        const minX = CUSHION_WIDTH + BALL_RADIUS;
        const maxX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS;
        const minY = CUSHION_WIDTH + BALL_RADIUS;
        const maxY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS;

        if (b.x < minX) {
          b.x = minX;
          b.vx = -b.vx * 0.85;
          playSound('cushion');
        } else if (b.x > maxX) {
          b.x = maxX;
          b.vx = -b.vx * 0.85;
          playSound('cushion');
        }

        if (b.y < minY) {
          b.y = minY;
          b.vy = -b.vy * 0.85;
          playSound('cushion');
        } else if (b.y > maxY) {
          b.y = maxY;
          b.vy = -b.vy * 0.85;
          playSound('cushion');
        }

        // Check Pockets
        for (const p of POCKETS) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < POCKET_RADIUS) {
            b.inPocket = true;
            b.vx = 0;
            b.vy = 0;
            playSound('pocket');

            // Handle pocket events
            if (b.type === 'cue') {
              setFoulMessage('Scratch! Cue ball sunk. Opponent ball in hand.');
              setTimeout(() => {
                b.inPocket = false;
                b.x = 220;
                b.y = TABLE_HEIGHT / 2;
                b.vx = 0;
                b.vy = 0;
              }, 1200);
            } else if (b.type === 'eight' && !matchSettledRef.current) {
              // 8-ball win/loss automatic settlement
              matchSettledRef.current = true;
              const winner = turnRef.current === 'player1' ? 'You' : opponent.name;
              matchWinnerRef.current = winner;
              setMatchWinner(winner);

              if (matchStartedRef.current && gameModeRef.current === 'pvp') {
                const won = winner === 'You';
                const settledPrize = prizeUsdRef.current;
                const settledStake = stakeUsdRef.current;
                const settledCrypto = selectedCryptoRef.current;
                const settledCryptoAmt = Number(cryptoAmountRef.current) || 0;
                const activeUserId = userIdRef.current;

                if (won) {
                  const currentBal = getWalletBalance(activeUserId);
                  setWalletBalance(activeUserId, currentBal + settledPrize);
                  pushNotification({
                    id: `pvp-pool-win-${matchKeyRef.current}`,
                    title: 'PvP 8-Ball Pool Settled: Won!',
                    message: `+$${settledPrize.toFixed(2)} automatically credited to your dollar balance.`,
                    type: 'win',
                    href: '/my-bets',
                    userId: activeUserId,
                  });
                  toast({
                    title: 'VICTORY! Auto-Settled 🎱',
                    description: `You won the match! +$${settledPrize.toFixed(2)} automatically credited to your balance.`,
                  });
                } else {
                  toast({
                    title: 'Match Settled',
                    description: `${opponent.name} sunk the 8-ball. PvP wager settled automatically.`,
                  });
                }

                // Persist automated settlement to backend ledger
                void (async () => {
                  try {
                    const token = await getAccessToken();
                    if (!token) return;
                    await fetch('/api/pvp/auto-settle', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        matchKey: matchKeyRef.current,
                        game: 'pool',
                        stakeUsd: settledStake,
                        cryptoType: settledCrypto,
                        cryptoAmount: settledCryptoAmt,
                        won,
                        payoutUsd: won ? settledPrize : 0,
                        rakeUsd: Number((settledStake * 2 * 0.04).toFixed(2)),
                      }),
                    });
                  } catch {
                    // ignore
                  }
                })();
              } else if (matchStartedRef.current && gameModeRef.current === 'practice') {
                toast({
                  title: 'Practice Frame Complete 🎱',
                  description: 'Nice shot! Switch to PvP Stake to compete for live payouts.',
                });
              }
            } else {
              // Assign groups if not assigned
              if (!player1GroupRef.current && (b.type === 'solid' || b.type === 'stripe')) {
                if (turnRef.current === 'player1') {
                  player1GroupRef.current = b.type;
                  setPlayer1Group(b.type);
                  setPlayer2Group(b.type === 'solid' ? 'stripe' : 'solid');
                } else {
                  const p1Group = b.type === 'solid' ? 'stripe' : 'solid';
                  player1GroupRef.current = p1Group;
                  setPlayer2Group(b.type);
                  setPlayer1Group(p1Group);
                }
              }
            }
          }
        }
      }

      // 2. Ball-to-Ball Elastic Collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.inPocket || b2.inPocket) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < BALL_RADIUS * 2) {
            // Overlap correction
            const overlap = BALL_RADIUS * 2 - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= (nx * overlap) / 2;
            b1.y -= (ny * overlap) / 2;
            b2.x += (nx * overlap) / 2;
            b2.y += (ny * overlap) / 2;

            // Elastic velocity exchange
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx * 0.95;
            b1.vy -= p * ny * 0.95;
            b2.vx += p * nx * 0.95;
            b2.vy += p * ny * 0.95;

            playSound('hit');
          }
        }
      }

      // Check if all balls stopped moving -> re-enable aiming
      if (!anyMoving && !isAimingRef.current && !matchWinnerRef.current) {
        isAimingRef.current = true;
        setIsAiming(true);
        // Switch turn if in PvP mode
        if (gameModeRef.current === 'pvp') {
          const nextTurn = turnRef.current === 'player1' ? 'player2' : 'player1';
          turnRef.current = nextTurn;
          setTurn(nextTurn);
        }
      }

      // 3. Render Table & Balls to Canvas
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Outer Wood Border
      ctx.fillStyle = '#11171E';
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Gold Trim Edge
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, TABLE_WIDTH - 12, TABLE_HEIGHT - 12);

      // Emerald Felt Cloth
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(
        CUSHION_WIDTH,
        CUSHION_WIDTH,
        TABLE_WIDTH - CUSHION_WIDTH * 2,
        TABLE_HEIGHT - CUSHION_WIDTH * 2
      );

      // Diamond Rail Markers
      ctx.fillStyle = '#CBD5E1';
      for (let i = 1; i <= 7; i++) {
        if (i === 4) continue; // mid pocket
        // Top and Bottom
        ctx.beginPath();
        ctx.arc((TABLE_WIDTH / 8) * i, CUSHION_WIDTH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc((TABLE_WIDTH / 8) * i, TABLE_HEIGHT - CUSHION_WIDTH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 1; i <= 3; i++) {
        // Left and Right
        ctx.beginPath();
        ctx.arc(CUSHION_WIDTH / 2, (TABLE_HEIGHT / 4) * i, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(TABLE_WIDTH - CUSHION_WIDTH / 2, (TABLE_HEIGHT / 4) * i, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw 6 Pockets
      for (const p of POCKETS) {
        ctx.fillStyle = '#05080A';
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS - 1, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Head String Break Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, CUSHION_WIDTH);
      ctx.lineTo(200, TABLE_HEIGHT - CUSHION_WIDTH);
      ctx.stroke();

      // Draw Balls
      for (const b of balls) {
        if (b.inPocket) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);

        if (b.type === 'stripe') {
          // Stripe Pattern
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - BALL_RADIUS, b.y - 4, BALL_RADIUS * 2, 8);
        } else {
          ctx.fillStyle = b.color;
          ctx.fill();
        }

        // Inner shadow / 3D specular glare
        const grad = ctx.createRadialGradient(
          b.x - 3,
          b.y - 3,
          1,
          b.x,
          b.y,
          BALL_RADIUS
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.7)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.1)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Ball Number Circle
        if (b.number > 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 5.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(b.number), b.x, b.y + 0.3);
        }

        ctx.restore();
      }

      // Aim Line and Cue Stick (when aiming)
      const cueBall = balls.find((b) => b.id === 0);
      if (cueBall && !cueBall.inPocket && isAimingRef.current && !matchWinnerRef.current) {
        const curAngle = aimAngleRef.current;
        const curPower = powerRef.current;
        ctx.save();

        // Trajectory Guideline
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(
          cueBall.x + Math.cos(curAngle) * 320,
          cueBall.y + Math.sin(curAngle) * 320
        );
        ctx.stroke();

        // Cue Stick Behind Ball
        const stickDist = 20 + (curPower / 100) * 30;
        const stickLength = 160;
        const startX = cueBall.x - Math.cos(curAngle) * stickDist;
        const startY = cueBall.y - Math.sin(curAngle) * stickDist;
        const endX = cueBall.x - Math.cos(curAngle) * (stickDist + stickLength);
        const endY = cueBall.y - Math.sin(curAngle) * (stickDist + stickLength);

        ctx.setLineDash([]);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
          startX - Math.cos(curAngle) * 12,
          startY - Math.sin(curAngle) * 12
        );
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [opponent.name, playSound, toast, getAccessToken]);

  // Pointer drag to aim
  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAimingRef.current || matchWinnerRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall || cueBall.inPocket) return;

    const angle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x);
    aimAngleRef.current = angle;
    setAimAngle(angle);
  };

  // Bot Opponent Simulation Turn
  useEffect(() => {
    if (turn !== 'player2' || !matchStarted || matchWinner || !isAiming || gameMode !== 'pvp') {
      return;
    }

    let innerTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      // Find best target ball
      const cueBall = ballsRef.current.find((b) => b.id === 0);
      const targetGroup = player2Group || 'solid';
      const eligible = ballsRef.current.filter(
        (b) => !b.inPocket && b.id !== 0 && (b.type === targetGroup || b.type === 'eight')
      );

      if (cueBall && eligible.length > 0) {
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        const shotAngle = Math.atan2(target.y - cueBall.y, target.x - cueBall.x) + (Math.random() - 0.5) * 0.15;
        const shotPower = 40 + Math.random() * 35;
        aimAngleRef.current = shotAngle;
        powerRef.current = shotPower;
        setAimAngle(shotAngle);
        setPower(shotPower);

        innerTimer = setTimeout(() => {
          handleShoot(shotAngle, shotPower);
        }, 800);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, [turn, matchStarted, matchWinner, isAiming, gameMode, player2Group, handleShoot]);

  // Target balls left for Player 1 & 2
  const solidsLeft = ballsRef.current.filter((b) => b.type === 'solid' && !b.inPocket).length;
  const stripesLeft = ballsRef.current.filter((b) => b.type === 'stripe' && !b.inPocket).length;

  return (
    <div className="min-h-screen text-[#F3F4F6] p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pvp"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white hover:border-[#22C55E] transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">
                PvP Billiards Floor
              </span>
              <span className="rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ADE80]">
                MULTI-CHAIN CUSTODY
              </span>
            </div>
            <h1 className="text-2xl font-extrabold font-display text-white">8-Ball Pool Arena</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 size={16} className="text-[#4ADE80]" /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#121820] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <RotateCcw size={14} />
            <span>Rack Balls</span>
          </button>
        </div>
      </div>

      {/* Multi-Chain Crypto Wagering Selector */}
      {!matchStarted && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins size={16} className="text-[#FACC15]" />
                <span>Configure Multi-Chain PvP Stake</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Play on Solana, EVM (Base/Ethereum), Bitcoin, or USDT with automatic $ USD equivalent settlement.
              </p>
            </div>

            {/* Mode & Currency Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#121820] p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setGameMode('pvp')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    gameMode === 'pvp'
                      ? 'bg-[#22C55E] text-black shadow-md shadow-[#22C55E]/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PvP Stake
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('practice')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    gameMode === 'practice'
                      ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Free Practice ($0)
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-[#121820] p-1 rounded-2xl border border-white/5">
                {(['SOL', 'ETH', 'BTC', 'USDT'] as const).map((curr) => {
                  const isSelected = selectedCrypto === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setSelectedCrypto(curr)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-[#22C55E] text-black shadow-md shadow-[#22C55E]/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {curr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {gameMode === 'pvp' ? (
            <>
              {/* Quick Stake Preset Buttons */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">Choose Stake Tier</span>
                  <span className="font-mono text-[#4ADE80] font-bold">
                    {cryptoAmount} {selectedCrypto} <span className="text-slate-400 font-normal">(${stakeUsd})</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[5, 10, 25, 50, 100].map((amt) => {
                    const isSelected = stakeUsd === amt;
                    const eqCrypto = (amt / CRYPTO_RATES[selectedCrypto]).toFixed(
                      selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2
                    );

                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStakeUsd(amt)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-[#22C55E]/40'
                            : 'border-white/[0.08] bg-[#121820] hover:border-white/20'
                        }`}
                      >
                        <span className="text-base font-extrabold font-mono text-white">${amt}</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {eqCrypto} {selectedCrypto}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-2.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">$</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={stakeUsd || ''}
                    onChange={(e) => setStakeUsd(Number(e.target.value))}
                    placeholder="Or enter custom $ stake..."
                    className="w-full rounded-2xl border border-white/10 bg-[#080C0F] py-2.5 pl-8 pr-4 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Pot summary and Match initiation */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/5 bg-[#121820] px-4 py-2">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Winner Prize Pot</span>
                    <span className="text-base font-extrabold font-mono text-[#FACC15]">
                      ${prizeUsd.toFixed(2)} <span className="text-xs text-slate-400">({prizeCrypto} {selectedCrypto})</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">4% protocol rake on payout</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartMatch}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-6 py-3.5 text-xs font-extrabold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Swords size={16} />
                  <span>Enter Table &amp; Stake {cryptoAmount} {selectedCrypto}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-[#FACC15]/25 bg-[#17160F] p-4">
              <div>
                <p className="text-xs font-bold text-[#FACC15]">Free Practice Mode ($0 Stake)</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Practice cue shots with zero balance required. Counts toward your Airtel 200MB Data Bonus play requirement!
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartMatch}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] hover:bg-[#eab308] px-6 py-3 text-xs font-extrabold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <Play size={15} className="fill-current" />
                <span>Start Free Practice</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live Match Scoreboard & Turn Display */}
      {matchStarted && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Player 1 Card (You) */}
          <div
            className={`flex items-center justify-between rounded-3xl border p-4 transition-all ${
              turn === 'player1'
                ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-[#22C55E]/40'
                : 'border-white/[0.08] bg-[#0E1318]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-[#22C55E]/40 bg-[#121820]">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt="You"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>You</span>
                  {turn === 'player1' && (
                    <span className="rounded-full bg-[#22C55E] px-2 py-0.2 text-[8px] font-mono font-bold text-black animate-pulse">
                      YOUR SHOT
                    </span>
                  )}
                </span>
                <p className="text-[10px] font-mono text-slate-400">
                  Target: <strong className="text-white uppercase">{player1Group || 'Any Ball'}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#4ADE80]">
                {player1Group === 'solid' ? `${7 - solidsLeft}/7` : player1Group === 'stripe' ? `${7 - stripesLeft}/7` : 'Open'}
              </span>
            </div>
          </div>

          {/* Table Center Pot Stats */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-3 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Match Pot</div>
            <div className="text-lg font-black font-mono text-[#FACC15] tabular-nums">
              ${prizeUsd.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-[#4ADE80]">
              {prizeCrypto} {selectedCrypto}
            </div>
          </div>

          {/* Player 2 Card (Opponent) */}
          <div
            className={`flex items-center justify-between rounded-3xl border p-4 transition-all ${
              turn === 'player2'
                ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-[#22C55E]/40'
                : 'border-white/[0.08] bg-[#0E1318]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-white/20">
                <img
                  src={opponent.avatar}
                  alt={opponent.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{opponent.name}</span>
                  {turn === 'player2' && (
                    <span className="rounded-full bg-[#FACC15] px-2 py-0.2 text-[8px] font-mono font-bold text-black animate-pulse">
                      AIMING
                    </span>
                  )}
                </span>
                <p className="text-[10px] font-mono text-slate-400">
                  Target: <strong className="text-white uppercase">{player2Group || 'Any Ball'}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#FACC15]">
                {player2Group === 'solid' ? `${7 - solidsLeft}/7` : player2Group === 'stripe' ? `${7 - stripesLeft}/7` : 'Open'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Billiards Canvas Frame */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-4 lg:p-6 shadow-2xl flex flex-col items-center">
        {foulMessage && (
          <div className="mb-3 rounded-full bg-rose-500/15 border border-rose-500/30 px-4 py-1 text-xs font-mono font-bold text-rose-400">
            {foulMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] border-4 border-[#141C24] max-w-full">
          <canvas
            ref={canvasRef}
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            onPointerDown={handleCanvasPointer}
            onPointerMove={handleCanvasPointer}
            className="cursor-crosshair block touch-none max-w-full h-auto"
          />

          {/* Winner Celebration Modal */}
          {matchWinner && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in fade-in">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#FACC15]/20 border border-[#FACC15]/50 text-[#FACC15] mb-3 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                <Trophy size={32} />
              </div>
              <h3 className="text-2xl font-black font-display text-white">
                {matchWinner === 'You' ? 'VICTORY!' : 'MATCH CONCLUDED'}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {matchWinner === 'You' ? (
                  <>
                    You pocketed the 8-ball and secured the pot of{' '}
                    <strong className="text-[#4ADE80] font-mono">
                      ${prizeUsd.toFixed(2)} ({prizeCrypto} {selectedCrypto})
                    </strong>
                    !
                  </>
                ) : (
                  `${matchWinner} sunk the 8-ball.`
                )}
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMatchWinner(null);
                    setMatchStarted(false);
                    handleReset();
                  }}
                  className="rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-6 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-[#22C55E]/30 transition-all"
                >
                  Play Again
                </button>
                <Link
                  href="/pvp"
                  className="rounded-2xl border border-white/10 bg-[#121820] px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Back to Lobby
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Cue Stick Controls */}
        <div className="mt-5 w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#121820] border border-white/5">
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Shot Strike Power</span>
              <span className="text-[#4ADE80] font-bold">{power}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={power}
              onChange={(e) => {
                const nextPower = Number(e.target.value);
                powerRef.current = nextPower;
                setPower(nextPower);
              }}
              className="w-full h-2 rounded-lg bg-[#080C0F] accent-[#22C55E] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!isAiming || Boolean(matchWinner) || (matchStarted && turn !== 'player1')}
              onClick={() => handleShoot()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-7 py-3 text-xs font-extrabold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play size={14} className="fill-current" />
              <span>STRIKE BALL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rules & Game Instructions */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <ShieldCheck size={16} className="text-[#4ADE80]" />
          <span>Billiard Rules & Onchain Settlement</span>
        </div>
        <p>
          1. Break: strike the cue ball into the rack. Sinking the first ball claims either <strong>Solids (1-7)</strong> or <strong>Stripes (9-15)</strong>.
        </p>
        <p>
          2. Clear all 7 balls of your assigned group before sinking the <strong>Black 8-Ball</strong>. Sinking the 8-ball prematurely results in a loss.
        </p>
        <p>
          3. Multi-chain payouts: Winner receives the entire match pot minus 4% protocol rake credited instantly to your in-app cash balance for on-chain withdrawal.
        </p>
      </div>
    </div>
  );
}
