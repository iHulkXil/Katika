import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { useToast } from '@/hooks/use-toast';
import { KatikaLogo } from '@/components/katika-logo';
import {
  Trophy,
  Swords,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Users,
  Award,
  ArrowRight,
  Shield,
  HelpCircle,
  Play,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Flame,
  Radio,
  Timer,
  Target,
} from 'lucide-react';

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER (EA FC STADIUM TRAINING AUDIO)
// =============================================================================
class PenaltyAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  playWhistle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2850, t);
      osc2.frequency.setValueAtTime(3240, t);

      const trill = this.ctx.createOscillator();
      const trillGain = this.ctx.createGain();
      trill.frequency.value = 34;
      trillGain.gain.value = 75;
      trill.connect(osc1.frequency);
      trill.start(t);
      trill.stop(t + 0.38);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } catch {}
  }

  playKick(powerMultiplier = 0.8) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(185, t);
      osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);

      const vol = Math.min(0.95, Math.max(0.4, powerMultiplier * 0.95));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {}
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;

      // 1. Net rustle
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1180;
      const netGain = this.ctx.createGain();
      netGain.gain.setValueAtTime(0.32, t);
      netGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      noise.connect(filter);
      filter.connect(netGain);
      netGain.connect(this.ctx.destination);
      noise.start(t);

      // 2. Crowd cheer
      const crowdBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.1, this.ctx.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdBuffer.length; i++) {
        crowdData[i] = (Math.random() * 2 - 1) * Math.sin((i / crowdBuffer.length) * Math.PI);
      }
      const crowd = this.ctx.createBufferSource();
      crowd.buffer = crowdBuffer;
      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'lowpass';
      crowdFilter.frequency.value = 850;
      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(0.02, t);
      crowdGain.gain.linearRampToValueAtTime(0.38, t + 0.22);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);
      crowd.start(t);
    } catch {}
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.48, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  playCueJoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.05);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  playCountdown(count: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(count === 1 ? 880 : 440, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = this.ctx!.currentTime + idx * 0.11;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    } catch {}
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// GAME TYPES: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) & 3V3 SQUAD
// =============================================================================
export type ShotDirection = 'left' | 'centre' | 'right';
export type DiveDirection = 'left' | 'centre' | 'right';
export type PitchElevation = 'low' | 'mid' | 'high' | 'panenka';
export type RunupStyle = 'sprint_blast' | 'stutter_step' | 'curved_approach' | 'panenka_chip';
export type KickStyle = 'power_laces' | 'finesse_curl' | 'chipped_dink';
export type KeeperMotion = 'top_corner_leap' | 'ground_sweep' | 'reflex_parry' | 'wrong_footed' | 'crossbar_tipper';

export interface SquadPlayer {
  id: string;
  name: string;
  number: number;
  role: 'striker' | 'keeper';
  isUser: boolean;
  avatarSeed: number;
}

export interface ShotResult {
  round: number;
  kickerSlot: number;
  team: 'A' | 'B';
  kickerName: string;
  keeperName: string;
  shotDirection: ShotDirection;
  diveDirection: DiveDirection;
  scored: boolean;
  powerKmH: number;
  pitchElevation: PitchElevation;
  runupStyle: RunupStyle;
  kickStyle: KickStyle;
  keeperMotion: KeeperMotion;
  composureQuality: 'green' | 'yellow' | 'red';
  message: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/pvp/penalty/:id');

  const { serverUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const [soundOn, setSoundOn] = useState(true);
  const [stake, setStake] = useState<number>(10);
  const [keeperControlAll, setKeeperControlAll] = useState<boolean>(true);

  // Match States
  const [matchState, setMatchState] = useState<
    'lobby' | 'queue_matching' | 'countdown' | 'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'
  >('lobby');

  // Matchmaking Queue State
  const [queuePlayersFound, setQueuePlayersFound] = useState<number>(1);
  const [queueStatusText, setQueueStatusText] = useState<string>('Searching 3v3 cue...');
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // 3 vs 3 Turns
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentKickerSlot, setCurrentKickerSlot] = useState<number>(0); // 0, 1, 2
  const [attackingTeam, setAttackingTeam] = useState<'A' | 'B'>('A');

  // Scores & Indicators
  const [scoreTeamA, setScoreTeamA] = useState<number>(0);
  const [scoreTeamB, setScoreTeamB] = useState<number>(0);
  const [shotsA, setShotsA] = useState<(boolean | null)[]>([null, null, null]);
  const [shotsB, setShotsB] = useState<(boolean | null)[]>([null, null, null]);
  const [history, setHistory] = useState<ShotResult[]>([]);

  // Telemetry & Results
  const [userSelectedDir, setUserSelectedDir] = useState<ShotDirection | null>(null);
  const [hoveredDir, setHoveredDir] = useState<ShotDirection | null>(null);
  const [activeShotData, setActiveShotData] = useState<ShotResult | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');

  // 3v3 Squads
  const teamA: SquadPlayer[] = useMemo(() => [
    { id: 'p1', name: legend?.name || 'K. MBAPPÉ', number: 10, role: 'striker', isUser: true, avatarSeed: 1 },
    { id: 'p2', name: 'V. JÚNIOR', number: 7, role: 'striker', isUser: false, avatarSeed: 2 },
    { id: 'p3', name: 'J. BELLINGHAM', number: 5, role: 'striker', isUser: false, avatarSeed: 3 },
  ], [legend?.name]);

  const teamB: SquadPlayer[] = useMemo(() => [
    { id: 'b1', name: 'T. COURTOIS', number: 1, role: 'keeper', isUser: false, avatarSeed: 4 },
    { id: 'b2', name: 'E. HAALAND', number: 9, role: 'striker', isUser: false, avatarSeed: 5 },
    { id: 'b3', name: 'K. DE BRUYNE', number: 17, role: 'striker', isUser: false, avatarSeed: 6 },
  ], []);

  // Active Shooter & Goalkeeper
  const currentShooter = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
  const currentKeeper = attackingTeam === 'A'
    ? teamB[currentKickerSlot]
    : teamA[keeperControlAll ? 0 : currentKickerSlot];

  const isUserTurnToShoot = attackingTeam === 'A' && currentShooter.isUser;
  const isUserTurnToSave = attackingTeam === 'B' && (keeperControlAll || currentKeeper.isUser);

  // Canvas & Physics References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Animation Progress & Physics
  const animProgressRef = useRef<{
    runup: number;
    ballT: number;
    keeperT: number;
    netRipple: number;
    ballSpin: number;
    composureRadius: number;
    composureColor: string;
    shotDir: ShotDirection;
    diveDir: DiveDirection;
    pitchElevation: PitchElevation;
    powerKmH: number;
    runupStyle: RunupStyle;
    kickStyle: KickStyle;
    keeperMotion: KeeperMotion;
    scored: boolean;
    flashRing: number;
  }>({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    netRipple: 0,
    ballSpin: 0,
    composureRadius: 36,
    composureColor: '#ef4444',
    shotDir: 'centre',
    diveDir: 'centre',
    pitchElevation: 'mid',
    powerKmH: 95,
    runupStyle: 'sprint_blast',
    kickStyle: 'power_laces',
    keeperMotion: 'reflex_parry',
    scored: false,
    flashRing: 0,
  });

  const toggleSound = () => {
    audio.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  // Join Matchmaking Queue
  const joinQueue = () => {
    setMatchState('queue_matching');
    setQueuePlayersFound(1);
    setQueueStatusText('Searching 3v3 Matchmaking Cue...');
    audio.playCueJoin();

    const interval = setInterval(() => {
      setQueuePlayersFound((prev) => {
        if (prev < 6) {
          audio.playCueJoin();
          const next = prev + 1;
          if (next === 3) setQueueStatusText('Katika Squad Assembled (3/3). Finding Rivals...');
          if (next === 5) setQueueStatusText('Rivals Joining (5/6)...');
          if (next === 6) {
            setQueueStatusText('3v3 Cue Full (6/6)! Connecting Stadium...');
            clearInterval(interval);
            setTimeout(() => {
              startCountdown();
            }, 600);
          }
          return next;
        }
        clearInterval(interval);
        return prev;
      });
    }, 450);
  };

  // 3-2-1 Countdown
  const startCountdown = () => {
    setMatchState('countdown');
    setCountdownNum(3);
    audio.playCountdown(3);

    const timer = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev > 1) {
          const next = prev - 1;
          audio.playCountdown(next);
          return next;
        }
        clearInterval(timer);
        startKickoff();
        return 0;
      });
    }, 750);
  };

  // Kickoff
  const startKickoff = () => {
    setScoreTeamA(0);
    setScoreTeamB(0);
    setShotsA([null, null, null]);
    setShotsB([null, null, null]);
    setCurrentRound(1);
    setCurrentKickerSlot(0);
    setAttackingTeam('A');
    setHistory([]);
    setUserSelectedDir(null);
    setActiveShotData(null);
    setMatchState('aiming');
    audio.playWhistle();
    setBannerNotice('FC 26 TRAINING ARENA · ROUND 1 OF 3');
  };

  // Spawn visual particles
  const spawnParticles = (x: number, y: number, color: string, count = 12, speed = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.5 + Math.random()) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        size: 1.5 + Math.random() * 2.5,
        color,
        alpha: 1,
        life: 0.9,
      });
    }
  };

  // Execute Shot Resolution
  const resolveShot = useCallback((shooterChoice: ShotDirection, keeperChoice: DiveDirection) => {
    const randomPower = Math.floor(82 + Math.random() * 44);

    const elevations: PitchElevation[] = ['low', 'mid', 'high', 'panenka'];
    const randomElevation = elevations[Math.floor(Math.random() * elevations.length)];

    const runupStyles: RunupStyle[] = ['sprint_blast', 'stutter_step', 'curved_approach', 'panenka_chip'];
    const randomRunup = runupStyles[Math.floor(Math.random() * runupStyles.length)];

    const kickStyles: KickStyle[] = ['power_laces', 'finesse_curl', 'chipped_dink'];
    const randomKick = kickStyles[Math.floor(Math.random() * kickStyles.length)];

    const keeperMotions: KeeperMotion[] = [
      'top_corner_leap',
      'ground_sweep',
      'reflex_parry',
      'wrong_footed',
      'crossbar_tipper',
    ];
    const randomKeeperMotion = keeperMotions[Math.floor(Math.random() * keeperMotions.length)];

    // Evaluate FC Composure Circle timing at moment of strike
    const r = animProgressRef.current.composureRadius;
    const compQuality: 'green' | 'yellow' | 'red' = r < 18 ? 'green' : r < 28 ? 'yellow' : 'red';

    let isGoal = false;
    let message = '';

    if (shooterChoice !== keeperChoice) {
      isGoal = true;
      message = compQuality === 'green'
        ? `PERFECT TIMED FINISH! Clinical strike buried in the ${shooterChoice} net!`
        : `GOAL! Keeper wrong-footed, strike tucked into the ${shooterChoice}!`;
    } else {
      const topCornerBullet = randomElevation === 'high' && randomPower >= 110;
      if (topCornerBullet) {
        isGoal = true;
        message = `UNSTOPPABLE! ${randomPower} km/h rocket into the top corner past the keeper's gloves!`;
      } else {
        isGoal = false;
        message = `SAVED! Courtois guessed ${keeperChoice} and made a brilliant reflex save!`;
      }
    }

    const shotResult: ShotResult = {
      round: currentRound,
      kickerSlot: currentKickerSlot,
      team: attackingTeam,
      kickerName: currentShooter.name,
      keeperName: currentKeeper.name,
      shotDirection: shooterChoice,
      diveDirection: keeperChoice,
      scored: isGoal,
      powerKmH: randomPower,
      pitchElevation: randomElevation,
      runupStyle: randomRunup,
      kickStyle: randomKick,
      keeperMotion: randomKeeperMotion,
      composureQuality: compQuality,
      message,
    };

    setActiveShotData(shotResult);
    animProgressRef.current.shotDir = shooterChoice;
    animProgressRef.current.diveDir = keeperChoice;
    animProgressRef.current.pitchElevation = randomElevation;
    animProgressRef.current.powerKmH = randomPower;
    animProgressRef.current.runupStyle = randomRunup;
    animProgressRef.current.kickStyle = randomKick;
    animProgressRef.current.keeperMotion = randomKeeperMotion;
    animProgressRef.current.scored = isGoal;
    animProgressRef.current.runup = 0;
    animProgressRef.current.ballT = 0;
    animProgressRef.current.keeperT = 0;
    animProgressRef.current.netRipple = 0;

    setMatchState('runup');

    // Kick impact timing
    setTimeout(() => {
      audio.playKick(randomPower / 120);
      setMatchState('ball_flight');

      const canvas = canvasRef.current;
      if (canvas) {
        spawnParticles(canvas.width / 2 + 10, canvas.height * 0.76, '#4ade80', 14, 2.5);
      }
    }, 420);

    // Goal or Save Resolution
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (isGoal) {
        audio.playGoal();
        setBannerNotice(`⚽ GOAL! ${randomPower} KM/H · ${shooterChoice.toUpperCase()}`);
        if (canvas) {
          spawnParticles(canvas.width / 2, canvas.height * 0.44, '#fde047', 18, 3.5);
        }
      } else {
        audio.playSave();
        setBannerNotice(`🧤 SAVED! ${currentKeeper.name} BLOCKS`);
        animProgressRef.current.flashRing = 1.0;
        if (canvas) {
          spawnParticles(canvas.width / 2, canvas.height * 0.46, '#38bdf8', 16, 3);
        }
      }
      setMatchState('shot_result');

      if (attackingTeam === 'A') {
        if (isGoal) setScoreTeamA((prev) => prev + 1);
        setShotsA((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      } else {
        if (isGoal) setScoreTeamB((prev) => prev + 1);
        setShotsB((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      }

      setHistory((prev) => [...prev, shotResult]);
    }, 860);

    // Next Turn
    setTimeout(() => {
      progressNextTurn(isGoal);
    }, 2900);
  }, [currentRound, currentKickerSlot, attackingTeam, currentShooter.name, currentKeeper.name]);

  // Turn Progression
  const progressNextTurn = useCallback((lastShotGoal: boolean) => {
    if (attackingTeam === 'A') {
      setAttackingTeam('B');
      setUserSelectedDir(null);
      setMatchState('aiming');
      setBannerNotice(`ROUND ${currentRound} · ${teamB[currentKickerSlot].name} TO KICK`);
      audio.playWhistle();
    } else {
      if (currentKickerSlot < 2) {
        const nextSlot = currentKickerSlot + 1;
        setCurrentKickerSlot(nextSlot);
        setCurrentRound(nextSlot + 1);
        setAttackingTeam('A');
        setUserSelectedDir(null);
        setMatchState('aiming');
        setBannerNotice(`ROUND ${nextSlot + 1} OF 3 · ${teamA[nextSlot].name} TO KICK`);
        audio.playWhistle();
      } else {
        const finalA = scoreTeamA + (attackingTeam === 'A' && lastShotGoal ? 1 : 0);
        const finalB = scoreTeamB + (attackingTeam === 'B' && lastShotGoal ? 1 : 0);

        setMatchState('game_over');
        audio.playFanfare();
        if (finalA > finalB) {
          toast({ title: '🏆 VICTORY!', description: 'Katika Elite won the 3v3 Penalty Shootout!' });
        } else if (finalB > finalA) {
          toast({ title: 'Defeat', description: 'Rivals edged the shootout. Better luck next time!' });
        } else {
          toast({ title: 'Draw!', description: 'Honors even in a thrilling 3v3 shootout!' });
        }
      }
    }
  }, [attackingTeam, currentKickerSlot, currentRound, scoreTeamA, scoreTeamB, teamA, teamB, toast]);

  // User Choice
  const handleUserChoice = (direction: ShotDirection) => {
    if (matchState !== 'aiming') return;
    setUserSelectedDir(direction);

    if (isUserTurnToShoot) {
      const dirs: DiveDirection[] = ['left', 'centre', 'right'];
      const aiKeeperChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(direction, aiKeeperChoice);
    } else if (isUserTurnToSave) {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const aiStrikerChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(aiStrikerChoice, direction);
    } else {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
      const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(sChoice, kChoice);
    }
  };

  // AI Spectate turn
  useEffect(() => {
    if (matchState === 'aiming' && !isUserTurnToShoot && !isUserTurnToSave) {
      const timer = setTimeout(() => {
        const dirs: ShotDirection[] = ['left', 'centre', 'right'];
        const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
        const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
        resolveShot(sChoice, kChoice);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matchState, isUserTurnToShoot, isUserTurnToSave, resolveShot]);

  // =============================================================================
  // CANVAS RENDERING ENGINE (EXACT EA FC 26 TRAINING ARENA GRAPHICS FROM VIDEO)
  // =============================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;
      const now = Date.now();
      const anim = animProgressRef.current;

      // -------------------------------------------------------------
      // 1. DAYLIGHT SKY & OUTDOOR LIGHTING (EXACTLY AS IN VIDEO)
      // -------------------------------------------------------------
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#bae6fd'); // soft pale daylight blue
      skyGrad.addColorStop(0.6, '#e0f2fe');
      skyGrad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant training facility trees & soft horizon haze
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, h * 0.28, w, h * 0.12);

      // Soft green background tree canopy
      for (let tx = 0; tx < w; tx += 45) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(tx + 20, h * 0.29, 28, 0, Math.PI);
        ctx.fill();
      }

      // -------------------------------------------------------------
      // 2. TALL OUTDOOR CHAINLINK FENCE & RED REBOUNDERS BEHIND GOAL
      // -------------------------------------------------------------
      const fenceY = h * 0.22;
      const fenceH = h * 0.24;

      // Dark steel posts of the court perimeter
      ctx.fillStyle = '#334155';
      for (let px = 20; px < w; px += 70) {
        ctx.fillRect(px, fenceY, 5, fenceH + 20);
      }

      // Chainlink wire mesh pattern
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 1;
      for (let fy = fenceY; fy <= fenceY + fenceH; fy += 8) {
        ctx.beginPath();
        ctx.moveTo(0, fy);
        ctx.lineTo(w, fy);
        ctx.stroke();
      }
      for (let fx = 0; fx <= w; fx += 10) {
        ctx.beginPath();
        ctx.moveTo(fx, fenceY);
        ctx.lineTo(fx, fenceY + fenceH);
        ctx.stroke();
      }

      // Red Training Rebounder Net Barriers behind goal (seen in video)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(w * 0.08, fenceY + 30, w * 0.22, fenceH - 25);
      ctx.fillRect(w * 0.70, fenceY + 30, w * 0.22, fenceH - 25);
      // White training barrier frames
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(w * 0.08, fenceY + 30, w * 0.22, fenceH - 25);
      ctx.strokeRect(w * 0.70, fenceY + 30, w * 0.22, fenceH - 25);

      // Concrete perimeter curb
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, fenceY + fenceH, w, 14);

      // -------------------------------------------------------------
      // 3. SUNLIT TRAINING PITCH (NATURAL GREEN LAWN WITH CUT STRIPES)
      // -------------------------------------------------------------
      const pitchStartY = fenceY + fenceH + 12;
      const pitchH = h - pitchStartY;

      // Natural grass bands in perspective
      const bands = 9;
      for (let b = 0; b < bands; b++) {
        const y1 = pitchStartY + (b / bands) * pitchH;
        const y2 = pitchStartY + ((b + 1) / bands) * pitchH;
        ctx.fillStyle = b % 2 === 0 ? '#427e36' : '#4e8c3f'; // Natural EA FC training grass
        ctx.fillRect(0, y1, w, y2 - y1);
      }

      // White Chalk Penalty Box and Goal Lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;

      const goalLineY = pitchStartY + pitchH * 0.16;
      ctx.beginPath();
      ctx.moveTo(w * 0.14, goalLineY);
      ctx.lineTo(w * 0.86, goalLineY);
      ctx.stroke();

      // Penalty Spot (Exactly positioned in front of striker)
      const spotX = w / 2 + 10;
      const spotY = h * 0.75;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(spotX, spotY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty D-Arc
      ctx.beginPath();
      ctx.arc(spotX, spotY - 12, 42, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      // -------------------------------------------------------------
      // 4. TRAINING GOAL FRAME & HIGH-DEFINITION NET MESH
      // -------------------------------------------------------------
      const goalW = w * 0.64;
      const goalX = (w - goalW) / 2;
      const crossbarY = goalLineY - 100;
      const postThickness = 7.5;

      const netBackY = crossbarY + 18;
      const netBackW = goalW * 0.94;
      const netBackX = (w - netBackW) / 2;

      // Net ripple when goal scored
      let netBulgeX = 0;
      let netBulgeY = 0;
      if (anim.scored && anim.ballT > 0.72) {
        anim.netRipple = Math.sin((anim.ballT - 0.72) * Math.PI * 3.6) * 16;
        if (anim.shotDir === 'left') netBulgeX = -anim.netRipple;
        if (anim.shotDir === 'right') netBulgeX = anim.netRipple;
        netBulgeY = -anim.netRipple * 0.5;
      }

      // Grey/black depth netting (seen in video)
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.2;

      // Horizontal net lines
      for (let ny = crossbarY; ny <= goalLineY; ny += 7) {
        ctx.beginPath();
        ctx.moveTo(goalX, ny);
        ctx.lineTo(goalX + goalW, ny);
        ctx.stroke();
      }
      // Vertical net lines
      for (let nx = goalX; nx <= goalX + goalW; nx += 9) {
        ctx.beginPath();
        ctx.moveTo(nx, crossbarY);
        ctx.lineTo(nx + netBulgeX * 0.5, goalLineY);
        ctx.stroke();
      }

      // Net depth back box
      ctx.beginPath();
      ctx.moveTo(goalX, crossbarY);
      ctx.lineTo(netBackX, netBackY);
      ctx.lineTo(netBackX + netBackW, netBackY);
      ctx.lineTo(goalX + goalW, crossbarY);
      ctx.stroke();

      // Clean White Metallic Goalposts
      const drawWhitePost = (px: number, py: number, pw: number, ph: number) => {
        const postGrad = ctx.createLinearGradient(px, py, px + pw, py);
        postGrad.addColorStop(0, '#e2e8f0');
        postGrad.addColorStop(0.3, '#ffffff');
        postGrad.addColorStop(0.7, '#f8fafc');
        postGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = postGrad;
        ctx.fillRect(px, py, pw, ph);
      };

      drawWhitePost(goalX - postThickness, crossbarY, postThickness, goalLineY - crossbarY);
      drawWhitePost(goalX + goalW, crossbarY, postThickness, goalLineY - crossbarY);

      const crossGrad = ctx.createLinearGradient(goalX, crossbarY, goalX, crossbarY + postThickness);
      crossGrad.addColorStop(0, '#ffffff');
      crossGrad.addColorStop(0.5, '#f8fafc');
      crossGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = crossGrad;
      ctx.fillRect(goalX - postThickness, crossbarY, goalW + postThickness * 2, postThickness);

      // -------------------------------------------------------------
      // 5. GOALKEEPER IN BLUE KIT (EXACTLY AS IN VIDEO)
      // -------------------------------------------------------------
      const keeperBaseX = w / 2;
      const keeperBaseY = goalLineY;

      let keeperX = keeperBaseX;
      let keeperY = keeperBaseY - 30;
      let keeperAngle = 0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const diveProgress = Math.min(1, anim.keeperT);

        let verticalLift = 18;
        if (anim.keeperMotion === 'top_corner_leap') verticalLift = 40;
        if (anim.keeperMotion === 'ground_sweep') verticalLift = 4;
        if (anim.keeperMotion === 'crossbar_tipper') verticalLift = 34;

        if (anim.diveDir === 'left') {
          keeperX = keeperBaseX - diveProgress * (goalW * 0.42);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = -0.85 * diveProgress;
        } else if (anim.diveDir === 'right') {
          keeperX = keeperBaseX + diveProgress * (goalW * 0.42);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = 0.85 * diveProgress;
        } else {
          keeperY = keeperBaseY - 30 - verticalLift * 0.6 * Math.sin(diveProgress * Math.PI);
        }
      } else {
        // Subtle realistic ready stance weight bouncing
        const idleBounce = Math.sin(now / 150) * 2.2;
        keeperY += idleBounce;
      }

      ctx.save();
      ctx.translate(keeperX, keeperY);
      ctx.rotate(keeperAngle);

      // Goalkeeper turf shadow (soft daytime sunlight shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(4, 28, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blue Jersey (Courtois style from video)
      const blueJersey = ctx.createLinearGradient(-12, -26, 12, 10);
      blueJersey.addColorStop(0, '#1d4ed8');
      blueJersey.addColorStop(0.5, '#2563eb');
      blueJersey.addColorStop(1, '#1e40af');
      ctx.fillStyle = blueJersey;
      ctx.beginPath();
      ctx.roundRect(-12, -26, 24, 32, 4);
      ctx.fill();

      // White chest trim
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -20, 12, 3);

      // Head & Hair
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -34, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, -39, 14, 5);

      // Arms & Gloves
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-24, -22, 14, 7);
      ctx.fillRect(10, -22, 14, 7);

      // White/Grey Goalkeeper Gloves
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-26, -18, 7, 0, Math.PI * 2);
      ctx.arc(26, -18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Blue Shorts
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-10, 6, 9, 16);
      ctx.fillRect(1, 6, 9, 16);

      // White Socks & Cleats
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, 18, 7, 10);
      ctx.fillRect(2, 18, 7, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, 27, 9, 5);
      ctx.fillRect(1, 27, 9, 5);

      ctx.restore();

      // Save impact flash
      if (anim.flashRing > 0) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${anim.flashRing})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(keeperX, keeperY, (1 - anim.flashRing) * 45 + 10, 0, Math.PI * 2);
        ctx.stroke();
        anim.flashRing -= 0.04;
      }

      // -------------------------------------------------------------
      // 6. THE FC 26 COMPOSURE CIRCLE ON GRASS (CENTRAL VIDEO FEATURE!)
      // -------------------------------------------------------------
      // The iconic composure ring around the ball expands and contracts!
      // In video: "Как всегда забивать пенальти с красным кругом в FC 26"
      if (matchState === 'aiming') {
        const cycle = (now % 1600) / 1600; // 1.6s pulsing loop
        // Smooth sine wave from wide (36px) to tight (14px)
        const radius = 14 + (Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5) * 22;
        anim.composureRadius = radius;

        // Color shifts: Red when wide -> Yellow/Orange mid -> Green when tight!
        let ringColor = '#ef4444'; // Red
        if (radius < 26) ringColor = '#f97316'; // Orange
        if (radius < 21) ringColor = '#eab308'; // Yellow
        if (radius < 17) ringColor = '#22c55e'; // Green (Sweet spot!)
        anim.composureColor = ringColor;

        // Outer glow
        ctx.save();
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;

        // Draw Composure Ring on turf around ball
        ctx.beginPath();
        ctx.ellipse(spotX, spotY, radius * 1.3, radius * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner subtle fill
        ctx.fillStyle = ringColor === '#22c55e' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.12)';
        ctx.fill();
        ctx.restore();

        // Controller Icon Prompt beside composure circle (as in video)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(spotX - radius * 1.4 - 10, spotY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', spotX - radius * 1.4 - 10, spotY + 3);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('Click / Aim', spotX - radius * 1.4 - 10, spotY + 14);
      }

      // -------------------------------------------------------------
      // 7. STRIKER IN NEON YELLOW/LIME KIT (EXACTLY AS IN VIDEO)
      // -------------------------------------------------------------
      // In video: Mbappé viewed from behind, positioned just to the left of the ball!
      let strikerBaseX = spotX - 32;
      let strikerBaseY = spotY + 28;
      let legAngle = 0;

      if (matchState === 'runup' || matchState === 'ball_flight' || matchState === 'shot_result') {
        const runupT = Math.min(1, anim.runup);
        strikerBaseX = spotX - 32 + runupT * 22;
        strikerBaseY = spotY + 28 - runupT * 32;
        legAngle = Math.sin(runupT * Math.PI * 2.8) * 0.9;
      }

      ctx.save();
      ctx.translate(strikerBaseX, strikerBaseY);

      // Soft natural daytime shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(4, 38, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neon Lime/Yellow Training Kit (as in video)
      const strikerJersey = ctx.createLinearGradient(-13, -30, 13, 8);
      strikerJersey.addColorStop(0, '#facc15'); // Bright yellow/lime
      strikerJersey.addColorStop(0.6, '#eab308');
      strikerJersey.addColorStop(1, '#ca8a04');
      ctx.fillStyle = strikerJersey;
      ctx.beginPath();
      ctx.roundRect(-13, -30, 26, 36, 4);
      ctx.fill();

      // Black shoulder accents & trim (as in video)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-13, -30, 6, 8);
      ctx.fillRect(7, -30, 6, 8);

      // Black Number 10 on back
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(currentShooter.number), 0, -8);

      // Head & Short Haircut (Mbappé style)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -39, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7, -44, 14, 4);

      // Black Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-11, 6, 10, 16);
      ctx.fillRect(1, 6, 10, 16);

      // Legs & Athletic Cleats with run-up stride
      ctx.save();
      ctx.rotate(legAngle);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-7, 20, 6, 15);
      ctx.fillStyle = '#ffffff'; // White/pink boot
      ctx.fillRect(-8, 34, 8, 6);
      ctx.restore();

      ctx.save();
      ctx.rotate(-legAngle * 0.7);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, 20, 6, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 34, 8, 6);
      ctx.restore();

      ctx.restore();

      // -------------------------------------------------------------
      // 8. SOCCER BALL WITH 3D FLIGHT, SPIN & TURF SHADOW
      // -------------------------------------------------------------
      let ballX = spotX;
      let ballY = spotY;
      let ballScale = 1.0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const flightT = Math.min(1, anim.ballT);

        let targetX = w / 2;
        if (anim.shotDir === 'left') targetX = goalX + goalW * 0.18;
        if (anim.shotDir === 'right') targetX = goalX + goalW * 0.82;

        let targetY = goalLineY - 28;
        if (anim.pitchElevation === 'low') targetY = goalLineY - 8;
        if (anim.pitchElevation === 'high') targetY = crossbarY + 14;
        if (anim.pitchElevation === 'panenka') targetY = crossbarY + 38;

        if (!anim.scored && flightT > 0.82) {
          targetX = keeperX + (anim.diveDir === 'left' ? -14 : 14);
          targetY = keeperY + 6;
        }

        ballX = spotX + flightT * (targetX - spotX);
        const linearY = spotY + flightT * (targetY - spotY);
        const arcLift = Math.sin(flightT * Math.PI) * (anim.pitchElevation === 'panenka' ? 68 : 28);
        ballY = linearY - arcLift;

        ballScale = 1.0 - flightT * 0.54;
        anim.ballSpin += 0.35;
      }

      // Ball turf shadow
      const shadowY = spotY + (ballY - spotY) * 0.35;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(ballX + 2, shadowY, 10 * ballScale, 4.5 * ballScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Official Match Ball Sphere
      const ballRadius = 9.5 * ballScale;
      ctx.save();
      ctx.translate(ballX, ballY);
      ctx.rotate(anim.ballSpin);

      const ballGrad = ctx.createRadialGradient(-ballRadius * 0.35, -ballRadius * 0.35, 1, 0, 0, ballRadius);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.7, '#e2e8f0');
      ballGrad.addColorStop(1, '#334155');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pentagon pattern
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // -------------------------------------------------------------
      // 9. AIMING RETICLES (STRICTLY 3 DIRECTIONS: LEFT, CENTRE, RIGHT)
      // -------------------------------------------------------------
      if (matchState === 'aiming') {
        const leftTargetX = goalX + goalW * 0.18;
        const centreTargetX = w / 2;
        const rightTargetX = goalX + goalW * 0.82;
        const targetY = goalLineY - 36;

        const drawFCTarget = (tx: number, ty: number, dir: ShotDirection) => {
          const isSelected = userSelectedDir === dir;
          const isHovered = hoveredDir === dir;
          const active = isSelected || isHovered;

          ctx.save();
          // Aim target circle in goal
          ctx.strokeStyle = active ? '#facc15' : 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = active ? 2.5 : 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(tx, ty, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = active ? 'rgba(250, 204, 21, 0.3)' : 'rgba(255, 255, 255, 0.1)';
          ctx.fill();

          // Crosshairs
          ctx.strokeStyle = active ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.moveTo(tx - 6, ty);
          ctx.lineTo(tx + 6, ty);
          ctx.moveTo(tx, ty - 6);
          ctx.lineTo(tx, ty + 6);
          ctx.stroke();

          // Direction label
          ctx.fillStyle = active ? '#fef08a' : '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(dir.toUpperCase(), tx, ty - 22);

          // Subtle aim guideline from ball to selected target
          if (active) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(spotX, spotY);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.restore();
        };

        drawFCTarget(leftTargetX, targetY, 'left');
        drawFCTarget(centreTargetX, targetY, 'centre');
        drawFCTarget(rightTargetX, targetY, 'right');
      }

      // -------------------------------------------------------------
      // 10. PARTICLE ENGINE
      // -------------------------------------------------------------
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Physics Clock Update
      if (matchState === 'runup') {
        anim.runup += 0.055;
      } else if (matchState === 'ball_flight') {
        const speed = (anim.powerKmH / 100) * 0.062;
        anim.ballT += speed;
        anim.keeperT += 0.068;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [matchState, attackingTeam, currentShooter.number, userSelectedDir, hoveredDir]);

  // Click on Canvas directly
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (matchState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.38) {
      handleUserChoice('left');
    } else if (x > w * 0.62) {
      handleUserChoice('right');
    } else {
      handleUserChoice('centre');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (matchState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.38) setHoveredDir('left');
    else if (x > w * 0.62) setHoveredDir('right');
    else setHoveredDir('centre');
  };

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none font-sans">
      {/* ============================================================= */}
      {/* VIEW A: LOBBY & 3V3 MATCHMAKING CUE SCREEN                    */}
      {/* ============================================================= */}
      {matchState === 'lobby' ? (
        <div className="space-y-3 pt-2">
          {/* EA FC Style Header Card */}
          <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399]">
                    FC 26 PRACTICE ARENA
                  </span>
                  <h1 className="text-lg font-black text-white">3v3 Penalty Shootout</h1>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-1 text-[11px] font-mono-custom text-[#35D399]">
                <Radio size={11} className="animate-pulse" />
                <span>3v3 CUE</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
              Experience authentic EA FC 26 penalty mechanics with the composure ring! 3 directions (Left, Centre, Right), 3v3 team shootout taking turns shooting &amp; saving.
            </p>
          </div>

          {/* 3v3 Squad Lineup Preview */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-custom text-xs font-bold text-white uppercase tracking-wider">
                3 vs 3 Squad Roster
              </span>
              <span className="font-mono-custom text-[10px] text-[#35D399]">6 Players Total</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Team Katika */}
              <div className="rounded-xl border border-[#35D399]/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-[#35D399] uppercase">
                    Katika Elite
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Your Team</span>
                </div>
                {teamA.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-white">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-[#35D399]">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>

              {/* Team Rivals */}
              <div className="rounded-xl border border-blue-500/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-blue-400 uppercase">
                    Rivals Squad
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Opponents</span>
                </div>
                {teamB.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-[#cbd5e1]">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-blue-400">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FC 26 Mechanic Highlight Card */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1612] p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono-custom text-[#fde047] font-bold text-[11px]">
              <Sparkles size={13} />
              <span>FC 26 Composure Ring Feature</span>
            </div>
            <p className="text-[11px] text-[#8FA39A] leading-relaxed">
              Watch the circular ring on the turf around the ball! When it contracts from wide <span className="text-red-400 font-bold">RED</span> to tight <span className="text-emerald-400 font-bold">GREEN</span>, strike the ball for maximum velocity &amp; precision into your chosen direction!
            </p>
          </div>

          {/* Stake Selector */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Wager Stake ($KTK)</span>
              <span className="font-mono-custom text-xs font-bold text-[#35D399]">
                {stake} KTK (Pot: {stake * 2} KTK)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 75].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`rounded-xl border py-2 text-center font-mono-custom text-xs font-bold transition-all ${
                    stake === amt
                      ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                      : 'border-[#1C3A2E] bg-black/40 text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {amt} KTK
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={joinQueue}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#208b61] via-[#35D399] to-[#208b61] py-3.5 text-sm font-black text-[#062018] shadow-lg transition-transform active:scale-[0.99] hover:opacity-95"
            >
              <Users size={18} />
              <span>JOIN 3v3 MATCHMAKING CUE</span>
            </button>

            <button
              type="button"
              onClick={startCountdown}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1C3A2E] bg-black/40 py-2.5 font-mono-custom text-xs font-bold text-[#8FA39A] hover:text-white"
            >
              <span>Instant FC Practice Kickoff →</span>
            </button>
          </div>
        </div>
      ) : matchState === 'queue_matching' ? (
        /* ============================================================= */
        /* VIEW B: ACTIVE CUE MATCHMAKING ANIMATION                      */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#35D399]/40 bg-[#091712] p-6 text-center shadow-2xl space-y-4">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#064e3b]/40 border border-[#35D399]/40">
            <Radio size={32} className="text-[#35D399] animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">3v3 Matchmaking Cue</h2>
            <p className="mt-1 font-mono-custom text-xs text-[#35D399]">{queueStatusText}</p>
          </div>

          <div className="mx-auto max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-custom text-[#8FA39A]">
              <span>Players in Cue:</span>
              <span className="font-bold text-[#fef08a]">{queuePlayersFound} / 6</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-[#1C3A2E]">
              <div
                className="h-full bg-gradient-to-r from-[#35D399] to-[#fef08a] transition-all duration-300"
                style={{ width: `${(queuePlayersFound / 6) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 pt-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className={`py-2 rounded-lg border text-center font-mono-custom text-[10px] font-bold ${
                  num <= queuePlayersFound
                    ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                    : 'border-[#1C3A2E] bg-black/40 text-[#475569]'
                }`}
              >
                P{num}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMatchState('lobby')}
            className="text-xs text-[#8FA39A] hover:text-white underline font-mono-custom pt-2"
          >
            Cancel Cue Search
          </button>
        </div>
      ) : matchState === 'countdown' ? (
        /* ============================================================= */
        /* VIEW C: 3-2-1 KICKOFF COUNTDOWN                               */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#fef08a]/40 bg-[#091712] p-8 text-center shadow-2xl space-y-3">
          <span className="font-mono-custom text-xs font-black uppercase tracking-widest text-[#35D399]">
            Arena Ready · 6 Players Connected
          </span>
          <div className="font-mono-custom text-7xl font-black text-[#fef08a] animate-ping">
            {countdownNum}
          </div>
          <p className="font-mono-custom text-sm font-bold text-white">GET READY TO SHOOT &amp; SAVE</p>
        </div>
      ) : (
        /* ============================================================= */
        /* VIEW D: LIVE FC 26 MATCH ARENA (SCOREBOARD, CANVAS, CONTROLLER)*/
        /* ============================================================= */
        <>
          {/* EA FC Top Practice HUD (Exact style from video!) */}
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-[#0f172a]/90 via-[#1e293b]/90 to-[#0f172a]/90 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              {/* Team A Info */}
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#eab308] p-1 font-black text-black text-xs shadow-sm">
                  10
                </div>
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    {teamA[currentKickerSlot].name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {shotsA.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#4ade80]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#64748b]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Centre EA FC Scoreboard */}
              <div className="text-center px-4 py-1 rounded-xl bg-black/60 border border-white/10 shadow-inner">
                <div className="font-mono-custom text-xl font-black text-[#fde047] tracking-widest">
                  {scoreTeamA} - {scoreTeamB}
                </div>
                <span className="font-mono-custom text-[8px] font-bold uppercase tracking-widest text-[#38bdf8]">
                  ПОПЫТКИ: {currentRound} / 3
                </span>
              </div>

              {/* Team B Info */}
              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    RIVALS
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {shotsB.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#4ade80]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#64748b]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2563eb] text-xs font-black text-white border border-blue-400/40 shadow-sm">
                  GK
                </div>
              </div>
            </div>

            {/* Broadcast Telemetry Strip */}
            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-mono-custom text-[#94a3b8]">
                <Target size={12} className="text-[#facc15]" />
                <span>KICKER: {currentShooter.name} vs GOALIE: {currentKeeper.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center gap-1 text-[#94a3b8] hover:text-white"
              >
                {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>

          {/* EA FC 26 TRAINING ARENA CANVAS */}
          <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={480}
              height={380}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="h-full w-full object-cover cursor-pointer"
            />

            {/* Broadcast Notice Banner */}
            {bannerNotice && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/60 bg-black/80 px-4 py-1 font-mono-custom text-[11px] font-black tracking-wider text-[#fde047] shadow-lg animate-fade-in backdrop-blur-sm">
                {bannerNotice}
              </div>
            )}

            {/* Bottom Subtitle / Prompt Bar (as in video: "Забейте как можно больше голов") */}
            {matchState === 'aiming' && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/70 px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-lg backdrop-blur-md border border-white/10">
                {isUserTurnToShoot
                  ? 'Забейте гол: выберите направление (Лево, Центр или Право)'
                  : isUserTurnToSave
                  ? 'Отразите удар: выберите прыжок вратаря'
                  : `Ход партнера: ${currentShooter.name}...`}
              </div>
            )}

            {/* Active Shot Telemetry Overlay */}
            {activeShotData && matchState === 'shot_result' && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-emerald-400/60 bg-black/90 px-4 py-2 font-mono-custom text-xs shadow-2xl backdrop-blur-md">
                <span className="font-bold text-[#fde047]">{activeShotData.powerKmH} KM/H</span>
                <span className="text-white/40">|</span>
                <span className="font-bold uppercase text-[#4ade80]">{activeShotData.pitchElevation}</span>
                <span className="text-white/40">|</span>
                <span className="font-black text-white">{activeShotData.shotDirection.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* INTERACTIVE CONTROLLER: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) */}
          <div className="mt-3">
            {matchState === 'aiming' ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-mono-custom text-xs font-black uppercase tracking-wider text-white">
                    {isUserTurnToShoot
                      ? '🎯 Выберите направление (3 зоны):'
                      : isUserTurnToSave
                      ? '🧤 Прыжок вратаря:'
                      : `Удар наносит ${currentShooter.name}...`}
                  </span>
                  <span className="font-mono-custom text-[10px] text-[#4ade80]">
                    {isUserTurnToShoot ? 'Striker' : isUserTurnToSave ? 'Keeper' : 'Squad Turn'}
                  </span>
                </div>

                {/* THE 3 DIRECTIONAL TARGET BUTTONS */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserChoice('left')}
                    onMouseEnter={() => setHoveredDir('left')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronLeft size={26} className="text-[#4ade80] group-hover:-translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      LEFT
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'Левый угол' : 'Прыжок влево'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('centre')}
                    onMouseEnter={() => setHoveredDir('centre')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#fde047] hover:bg-[#fde047]/15 active:scale-95 shadow-lg"
                  >
                    <Zap size={26} className="text-[#fde047] group-hover:scale-110 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      CENTRE
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'По центру' : 'Остаться'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('right')}
                    onMouseEnter={() => setHoveredDir('right')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronRight size={26} className="text-[#4ade80] group-hover:translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      RIGHT
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'Правый угол' : 'Прыжок вправо'}
                    </span>
                  </button>
                </div>
              </div>
            ) : matchState === 'game_over' ? (
              <div className="rounded-3xl border border-yellow-500/60 bg-slate-900 p-5 text-center shadow-2xl animate-fade-in">
                <Trophy size={40} className="mx-auto text-[#fde047] animate-bounce" />
                <h3 className="mt-2 text-xl font-black text-white">Shootout Concluded!</h3>
                <p className="font-mono-custom text-base font-bold text-[#4ade80]">
                  Final Score: {scoreTeamA} - {scoreTeamB}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {scoreTeamA > scoreTeamB
                    ? 'Katika Elite wins the match!'
                    : scoreTeamB > scoreTeamA
                    ? 'Rivals edged the victory.'
                    : 'A hard-fought draw!'}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchState('lobby')}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] py-3 font-mono-custom text-xs font-black text-black shadow-lg hover:opacity-95"
                  >
                    NEW 3v3 MATCH
                  </button>
                  <Link
                    href="/pvp"
                    className="rounded-xl border border-slate-700 bg-black/40 px-4 py-3 font-mono-custom text-xs font-bold text-slate-400 hover:text-white"
                  >
                    PvP Floor
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 py-4 text-center font-mono-custom text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fde047] animate-ping" />
                <span>Kick in flight · Resolving strike...</span>
              </div>
            )}
          </div>

          {/* 3 VS 3 ROSTER PREVIEW STRIP */}
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="flex items-center justify-between text-[10px] font-mono-custom text-slate-400 uppercase tracking-wider mb-2">
              <span>3v3 Squad Lineup</span>
              <span className="text-[#4ade80]">Taking Turns: Shoot &amp; Save</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Team A Lineup */}
              <div className="rounded-xl border border-emerald-500/30 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-[#4ade80] uppercase">
                  Katika Elite
                </span>
                {teamA.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'A'
                        ? 'bg-[#4ade80]/20 font-bold text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'A' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Team B Lineup */}
              <div className="rounded-xl border border-blue-500/30 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-blue-400 uppercase">
                  Rivals Squad
                </span>
                {teamB.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'B'
                        ? 'bg-blue-500/20 font-bold text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'B' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
