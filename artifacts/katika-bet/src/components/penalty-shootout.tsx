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
  Bot,
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
  UserCheck,
  Radio,
  Timer,
  Info,
} from 'lucide-react';

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER (PUNCHY BROADCAST AUDIO, NO EXTERNAL ASSETS)
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
      osc2.frequency.setValueAtTime(3220, t);

      // Trill modulation
      const trill = this.ctx.createOscillator();
      const trillGain = this.ctx.createGain();
      trill.frequency.value = 32;
      trillGain.gain.value = 70;
      trill.connect(osc1.frequency);
      trill.start(t);
      trill.stop(t + 0.38);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } catch {
      // Audio fallback
    }
  }

  playKick(powerMultiplier = 0.8) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Resonant punchy leather impact
      osc.type = 'sine';
      osc.frequency.setValueAtTime(175, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.14);

      const vol = Math.min(0.9, Math.max(0.35, powerMultiplier * 0.9));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {
      // Audio fallback
    }
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;

      // 1. Net rustle noise
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1150;
      const netGain = this.ctx.createGain();
      netGain.gain.setValueAtTime(0.28, t);
      netGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      noise.connect(filter);
      filter.connect(netGain);
      netGain.connect(this.ctx.destination);
      noise.start(t);

      // 2. Crowd stadium roar
      const crowdBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.1, this.ctx.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdBuffer.length; i++) {
        crowdData[i] = (Math.random() * 2 - 1) * Math.sin((i / crowdBuffer.length) * Math.PI);
      }
      const crowd = this.ctx.createBufferSource();
      crowd.buffer = crowdBuffer;
      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'lowpass';
      crowdFilter.frequency.value = 820;
      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(0.02, t);
      crowdGain.gain.linearRampToValueAtTime(0.38, t + 0.22);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);
      crowd.start(t);
    } catch {
      // Audio fallback
    }
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Glove slap impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.11);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch {
      // Audio fallback
    }
  }

  playPost() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1820, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.26);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {
      // Audio fallback
    }
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
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880, t + 0.05); // A5
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {
      // Audio fallback
    }
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
    } catch {
      // Audio fallback
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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
    } catch {
      // Audio fallback
    }
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// TYPES: ONLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) & 3V3 MULTIPLAYER SQUAD
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
  message: string;
}

export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/pvp/penalty/:id');

  const { serverUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const [soundOn, setSoundOn] = useState(true);
  const [gameMode, setGameMode] = useState<'queue' | 'ai' | 'pass_and_play'>('queue');
  const [stake, setStake] = useState<number>(10);
  const [keeperControlAll, setKeeperControlAll] = useState<boolean>(true); // User controls all keeper dives for their team by default

  // Match States: 'lobby' -> 'queue_matching' -> 'countdown' -> 'aiming' -> 'runup' -> 'ball_flight' -> 'shot_result' -> 'game_over'
  const [matchState, setMatchState] = useState<
    'lobby' | 'queue_matching' | 'countdown' | 'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'
  >('lobby');

  // Queue Matchmaking State (Finding 6 players)
  const [queuePlayersFound, setQueuePlayersFound] = useState<number>(1);
  const [queueStatusText, setQueueStatusText] = useState<string>('Searching 3v3 cue...');
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // 3 vs 3 Match Turn Progression
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentKickerSlot, setCurrentKickerSlot] = useState<number>(0); // 0, 1, 2
  const [attackingTeam, setAttackingTeam] = useState<'A' | 'B'>('A');

  // Score & History
  const [scoreTeamA, setScoreTeamA] = useState<number>(0);
  const [scoreTeamB, setScoreTeamB] = useState<number>(0);
  const [shotsA, setShotsA] = useState<(boolean | null)[]>([null, null, null]);
  const [shotsB, setShotsB] = useState<(boolean | null)[]>([null, null, null]);
  const [history, setHistory] = useState<ShotResult[]>([]);

  // Telemetry & Results
  const [userSelectedDir, setUserSelectedDir] = useState<ShotDirection | null>(null);
  const [activeShotData, setActiveShotData] = useState<ShotResult | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');

  // 3v3 Squads: 3 players on each team
  const teamA: SquadPlayer[] = useMemo(() => [
    { id: 'p1', name: legend?.name || 'Katika Cap (You)', number: 10, role: 'striker', isUser: true, avatarSeed: 1 },
    { id: 'p2', name: 'Alvarez_19', number: 19, role: 'striker', isUser: false, avatarSeed: 2 },
    { id: 'p3', name: 'Rashford_11', number: 11, role: 'striker', isUser: false, avatarSeed: 3 },
  ], [legend?.name]);

  const teamB: SquadPlayer[] = useMemo(() => [
    { id: 'b1', name: 'Declan_4', number: 4, role: 'striker', isUser: false, avatarSeed: 4 },
    { id: 'b2', name: 'Haaland_9', number: 9, role: 'striker', isUser: false, avatarSeed: 5 },
    { id: 'b3', name: 'Courtois_1', number: 1, role: 'keeper', isUser: false, avatarSeed: 6 },
  ], []);

  // Active Shooter & Goalkeeper
  const currentShooter = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
  const currentKeeper = attackingTeam === 'A'
    ? teamB[currentKickerSlot]
    : teamA[keeperControlAll ? 0 : currentKickerSlot];

  // User Turn Detection:
  // - User shoots when Team A kicks and current shooter is User
  // - User saves when Team B kicks and current keeper is User (or User controls all team saves)
  const isUserTurnToShoot = attackingTeam === 'A' && currentShooter.isUser;
  const isUserTurnToSave = attackingTeam === 'B' && (keeperControlAll || currentKeeper.isUser);

  // Canvas & Physics References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Physics, Motions & Progress
  const animProgressRef = useRef<{
    runup: number;
    ballT: number;
    keeperT: number;
    netRipple: number;
    shotDir: ShotDirection;
    diveDir: DiveDirection;
    pitchElevation: PitchElevation;
    powerKmH: number;
    runupStyle: RunupStyle;
    kickStyle: KickStyle;
    keeperMotion: KeeperMotion;
    scored: boolean;
    flashTime: number;
  }>({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    netRipple: 0,
    shotDir: 'centre',
    diveDir: 'centre',
    pitchElevation: 'mid',
    powerKmH: 95,
    runupStyle: 'sprint_blast',
    kickStyle: 'power_laces',
    keeperMotion: 'reflex_parry',
    scored: false,
    flashTime: 0,
  });

  const toggleSound = () => {
    audio.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  // Join Matchmaking Queue (3 vs 3 Matching)
  const joinQueue = () => {
    setMatchState('queue_matching');
    setQueuePlayersFound(1);
    setQueueStatusText('Searching 3v3 Matchmaking Cue...');
    audio.playCueJoin();

    // Simulate 6 players joining the cue
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

  // Start 3-2-1 Countdown before Kick-Off
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

  // Kickoff Round 1
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
    setBannerNotice('MATCH STARTED · ROUND 1 OF 3');
  };

  // Execute a Penalty Shot Resolution
  const resolveShot = useCallback((shooterChoice: ShotDirection, keeperChoice: DiveDirection) => {
    // 1. RANDOMIZE POWER (km/h)
    const randomPower = Math.floor(75 + Math.random() * 48); // 75 - 123 km/h

    // 2. RANDOMIZE SHOT PITCH (Elevation)
    const elevations: PitchElevation[] = ['low', 'mid', 'high', 'panenka'];
    const randomElevation = elevations[Math.floor(Math.random() * elevations.length)];

    // 3. RANDOMIZE PLAYER MOTIONS (Run-up & Kick Style & Keeper Dive Motion)
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

    // 4. CORE 3-DIRECTION RESOLUTION LOGIC
    // ONLY 3 DIRECTIONS: 'left' | 'centre' | 'right'
    let isGoal = false;
    let message = '';

    if (shooterChoice !== keeperChoice) {
      // Keeper dived the wrong direction
      isGoal = true;
      message = `GOAL! Keeper wrong-footed, clean strike into the ${shooterChoice} net!`;
    } else {
      // Keeper guessed the correct direction
      const unstoppableTopCorner = randomElevation === 'high' && randomPower >= 110;
      if (unstoppableTopCorner) {
        isGoal = true;
        message = `GOAL! ${randomPower} km/h bullet sniped top corner just past the keeper's fingertips!`;
      } else {
        isGoal = false;
        message = `SAVED! Keeper guessed ${keeperChoice} and made a spectacular diving block!`;
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
      message,
    };

    setActiveShotData(shotResult);
    animProgressRef.current = {
      runup: 0,
      ballT: 0,
      keeperT: 0,
      netRipple: 0,
      shotDir: shooterChoice,
      diveDir: keeperChoice,
      pitchElevation: randomElevation,
      powerKmH: randomPower,
      runupStyle: randomRunup,
      kickStyle: randomKick,
      keeperMotion: randomKeeperMotion,
      scored: isGoal,
      flashTime: Date.now(),
    };

    // Transition to Run-up Animation
    setMatchState('runup');

    // Trigger Kick Impact Sound & Transition to Ball Flight
    setTimeout(() => {
      audio.playKick(randomPower / 120);
      setMatchState('ball_flight');
    }, 440);

    // Goal or Save Resolution Audio & Score Update
    setTimeout(() => {
      if (isGoal) {
        audio.playGoal();
        setBannerNotice(`⚽ GOAL! ${randomPower} KM/H · ${shooterChoice.toUpperCase()}`);
      } else {
        audio.playSave();
        setBannerNotice(`🧤 SAVED! ${currentKeeper.name} BLOCKS`);
      }
      setMatchState('shot_result');

      // Update team penalty indicators
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

    // Progress to Next Turn
    setTimeout(() => {
      progressNextTurn(isGoal);
    }, 2900);
  }, [currentRound, currentKickerSlot, attackingTeam, currentShooter.name, currentKeeper.name]);

  // Turn Progression Logic for 3v3 Shootout
  const progressNextTurn = useCallback((lastShotGoal: boolean) => {
    if (attackingTeam === 'A') {
      // Team A finished kicking. Now Team B steps up to kick (Team A defends)
      setAttackingTeam('B');
      setUserSelectedDir(null);
      setMatchState('aiming');
      setBannerNotice(`ROUND ${currentRound} · ${teamB[currentKickerSlot].name} TO KICK`);
      audio.playWhistle();
    } else {
      // Both teams finished this kicker slot!
      if (currentKickerSlot < 2) {
        // Advance to next squad kicker (Slot 1 or Slot 2)
        const nextSlot = currentKickerSlot + 1;
        setCurrentKickerSlot(nextSlot);
        setCurrentRound(nextSlot + 1);
        setAttackingTeam('A');
        setUserSelectedDir(null);
        setMatchState('aiming');
        setBannerNotice(`ROUND ${nextSlot + 1} OF 3 · ${teamA[nextSlot].name} TO KICK`);
        audio.playWhistle();
      } else {
        // Conclude 3v3 Shootout
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

  // Handle User Input Button Click (STRICTLY 3 DIRECTIONS: LEFT, CENTRE, RIGHT)
  const handleUserChoice = (direction: ShotDirection) => {
    if (matchState !== 'aiming') return;
    setUserSelectedDir(direction);

    if (isUserTurnToShoot) {
      // User is shooting: AI keeper dives in 1 of the 3 directions
      const dirs: DiveDirection[] = ['left', 'centre', 'right'];
      const aiKeeperChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(direction, aiKeeperChoice);
    } else if (isUserTurnToSave) {
      // User is goalkeeper: AI striker aims in 1 of the 3 directions
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const aiStrikerChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(aiStrikerChoice, direction);
    } else {
      // Spectating squadmate turn: AI striker vs AI keeper
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
      const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(sChoice, kChoice);
    }
  };

  // If Spectating an AI vs AI slot, automatically trigger with broadcast pause
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
  // BROADCAST 3D CANVAS RENDERING ENGINE (HIGH-LEVEL GRAPHICS)
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

      // 1. STADIUM NIGHT ATMOSPHERE & SKY GRADIENT
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#030806');
      skyGrad.addColorStop(0.6, '#061710');
      skyGrad.addColorStop(1, '#0c2e1f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Stadium Halogen Floodlights with Volumetric Halos
      const drawFloodlight = (x: number, y: number) => {
        const glow = ctx.createRadialGradient(x, y, 4, x, y, 75);
        glow.addColorStop(0, 'rgba(255, 255, 245, 0.95)');
        glow.addColorStop(0.25, 'rgba(160, 245, 195, 0.35)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 75, 0, Math.PI * 2);
        ctx.fill();

        // Stanchion fixture
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x - 9, y - 2, 18, 5);
      };
      drawFloodlight(w * 0.12, h * 0.08);
      drawFloodlight(w * 0.88, h * 0.08);

      // 2. STADIUM STANDS & CROWD
      const crowdY = h * 0.14;
      const crowdH = h * 0.22;
      ctx.fillStyle = '#05120d';
      ctx.fillRect(0, crowdY, w, crowdH);

      // Tiered rows with waving fans & camera flash strobes
      for (let r = 0; r < 5; r++) {
        const rowY = crowdY + r * 14;
        ctx.fillStyle = r % 2 === 0 ? 'rgba(14, 34, 24, 0.75)' : 'rgba(20, 48, 34, 0.75)';
        ctx.fillRect(0, rowY, w, 12);

        for (let c = 10; c < w; c += 16) {
          const headX = c + (r % 2) * 8;
          ctx.fillStyle = '#1e382b';
          ctx.beginPath();
          ctx.arc(headX, rowY + 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Random camera flash in the stands!
          if (Math.random() < 0.016) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(headX, rowY + 3, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. PITCH-SIDE DIGITAL LED ADVERTISING HOARDINGS
      const ledY = h * 0.36;
      const ledH = 22;
      const ledGrad = ctx.createLinearGradient(0, ledY, 0, ledY + ledH);
      ledGrad.addColorStop(0, '#064e3b');
      ledGrad.addColorStop(0.5, '#022c22');
      ledGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = ledGrad;
      ctx.fillRect(0, ledY, w, ledH);
      ctx.strokeStyle = '#35d399';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, ledY, w, ledH);

      // Scrolling LED Banner
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ KATIKA.BET · 3v3 PENALTY SHOOTOUT · EMERALD ELITE · $KTK POTS', w / 2, ledY + 14);

      // 4. PERSPECTIVE CUT-LAWN PITCH
      const pitchStartY = ledY + ledH;
      const pitchH = h - pitchStartY;

      // 3D Alternating grass bands
      const bands = 7;
      for (let b = 0; b < bands; b++) {
        const y1 = pitchStartY + (b / bands) * pitchH;
        const y2 = pitchStartY + ((b + 1) / bands) * pitchH;
        ctx.fillStyle = b % 2 === 0 ? '#103926' : '#14462f';
        ctx.fillRect(0, y1, w, y2 - y1);
      }

      // Chalk Penalty Box
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.5;

      const goalLineY = pitchStartY + pitchH * 0.12;
      ctx.beginPath();
      ctx.moveTo(w * 0.18, goalLineY);
      ctx.lineTo(w * 0.82, goalLineY);
      ctx.stroke();

      // Penalty Spot
      const spotX = w / 2;
      const spotY = h * 0.74;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(spotX, spotY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Arc (D-Box top curve)
      ctx.beginPath();
      ctx.arc(spotX, spotY - 8, 38, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      // 5. 3D GOAL FRAME & NET MESH
      const goalW = w * 0.58;
      const goalX = (w - goalW) / 2;
      const crossbarY = goalLineY - 95;
      const postThickness = 7;

      const netBackY = crossbarY + 14;
      const netBackW = goalW * 0.94;
      const netBackX = (w - netBackW) / 2;

      // Dynamic Net Ripple Bulge when goal scored
      const anim = animProgressRef.current;
      let netBulgeX = 0;
      let netBulgeY = 0;
      if (anim.scored && anim.ballT > 0.7) {
        anim.netRipple = Math.sin((anim.ballT - 0.7) * Math.PI * 3.3) * 12;
        if (anim.shotDir === 'left') netBulgeX = -anim.netRipple;
        if (anim.shotDir === 'right') netBulgeX = anim.netRipple;
        netBulgeY = -anim.netRipple * 0.5;
      }

      // Net Diamond Mesh
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      // Horizontal net lines
      for (let ny = crossbarY; ny <= goalLineY; ny += 8) {
        ctx.beginPath();
        ctx.moveTo(goalX, ny);
        ctx.lineTo(goalX + goalW, ny);
        ctx.stroke();
      }
      // Vertical net lines with ripple displacement
      for (let nx = goalX; nx <= goalX + goalW; nx += 10) {
        ctx.beginPath();
        ctx.moveTo(nx, crossbarY);
        ctx.lineTo(nx + netBulgeX * 0.5, goalLineY);
        ctx.stroke();
      }

      // Net depth box lines
      ctx.beginPath();
      ctx.moveTo(goalX, crossbarY);
      ctx.lineTo(netBackX, netBackY);
      ctx.lineTo(netBackX + netBackW, netBackY);
      ctx.lineTo(goalX + goalW, crossbarY);
      ctx.stroke();

      // Metallic Specular Goalposts
      const drawPost = (px: number, py: number, pw: number, ph: number) => {
        const postGrad = ctx.createLinearGradient(px, py, px + pw, py);
        postGrad.addColorStop(0, '#94a3b8');
        postGrad.addColorStop(0.4, '#ffffff');
        postGrad.addColorStop(0.8, '#cbd5e1');
        postGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = postGrad;
        ctx.fillRect(px, py, pw, ph);
      };

      // Left Upright Post
      drawPost(goalX - postThickness, crossbarY, postThickness, goalLineY - crossbarY);
      // Right Upright Post
      drawPost(goalX + goalW, crossbarY, postThickness, goalLineY - crossbarY);
      // Horizontal Crossbar
      const crossGrad = ctx.createLinearGradient(goalX, crossbarY, goalX, crossbarY + postThickness);
      crossGrad.addColorStop(0, '#ffffff');
      crossGrad.addColorStop(0.5, '#e2e8f0');
      crossGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = crossGrad;
      ctx.fillRect(goalX - postThickness, crossbarY, goalW + postThickness * 2, postThickness);

      // Interactive Goal Direction Reticles (Shown during AIMING phase)
      if (matchState === 'aiming') {
        const targetRadius = 16;
        const pulse = Math.sin(Date.now() / 150) * 3;

        const drawReticle = (rx: number, ry: number, label: string, active: boolean) => {
          ctx.strokeStyle = active ? '#fef08a' : 'rgba(53, 211, 153, 0.7)';
          ctx.fillStyle = active ? 'rgba(254, 240, 138, 0.3)' : 'rgba(53, 211, 153, 0.15)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(rx, ry, targetRadius + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Crosshairs
          ctx.beginPath();
          ctx.moveTo(rx - 8, ry);
          ctx.lineTo(rx + 8, ry);
          ctx.moveTo(rx, ry - 8);
          ctx.lineTo(rx, ry + 8);
          ctx.stroke();

          // Label
          ctx.fillStyle = active ? '#fef08a' : '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, rx, ry - targetRadius - 4);
        };

        drawReticle(goalX + goalW * 0.18, goalLineY - 35, 'LEFT', userSelectedDir === 'left');
        drawReticle(w / 2, goalLineY - 35, 'CENTRE', userSelectedDir === 'centre');
        drawReticle(goalX + goalW * 0.82, goalLineY - 35, 'RIGHT', userSelectedDir === 'right');
      }

      // 6. ANIMATED 3D GOALKEEPER (WITH RANDOM MOTION VARIATION)
      const keeperBaseX = w / 2;
      const keeperBaseY = goalLineY;

      let keeperX = keeperBaseX;
      let keeperY = keeperBaseY - 26;
      let keeperAngle = 0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const diveProgress = Math.min(1, anim.keeperT);

        // Motion style variations:
        let verticalLift = 14;
        if (anim.keeperMotion === 'top_corner_leap') verticalLift = 34;
        if (anim.keeperMotion === 'ground_sweep') verticalLift = 4;
        if (anim.keeperMotion === 'crossbar_tipper') verticalLift = 30;

        if (anim.diveDir === 'left') {
          keeperX = keeperBaseX - diveProgress * (goalW * 0.38);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = -0.75 * diveProgress;
        } else if (anim.diveDir === 'right') {
          keeperX = keeperBaseX + diveProgress * (goalW * 0.38);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = 0.75 * diveProgress;
        } else {
          // Centre hold/parry
          keeperY = keeperBaseY - 26 - verticalLift * 0.6 * Math.sin(diveProgress * Math.PI);
        }
      } else {
        // Idle ready stance bounce
        const idleBounce = Math.sin(Date.now() / 170) * 2.2;
        keeperY += idleBounce;
      }

      ctx.save();
      ctx.translate(keeperX, keeperY);
      ctx.rotate(keeperAngle);

      // Keeper Pitch Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 24, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Keeper Body (High-vis neon orange/yellow)
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-10, -22, 20, 26);
      ctx.strokeStyle = '#c2410c';
      ctx.strokeRect(-10, -22, 20, 26);

      // Keeper Head
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, -31, 8, 0, Math.PI * 2);
      ctx.fill();

      // Arms & High-Vis Gloves
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-22, -18, 12, 6);
      ctx.fillRect(10, -18, 12, 6);

      // Neon Gloves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-24, -15, 6, 0, Math.PI * 2);
      ctx.arc(24, -15, 6, 0, Math.PI * 2);
      ctx.fill();

      // Shorts & Boots
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, 4, 6, 16);
      ctx.fillRect(2, 4, 6, 16);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-9, 18, 7, 4);
      ctx.fillRect(2, 18, 7, 4);

      ctx.restore();

      // 7. ANIMATED 3D STRIKER (STANDS AT SPOT & RUNS UP WITH PROCEDURAL MOTIONS)
      let strikerX = spotX - 24;
      let strikerY = spotY + 44;
      let legAngle = 0;

      // Adjust runup approach based on procedural runup style
      let runupStartX = spotX - 24;
      if (anim.runupStyle === 'curved_approach') runupStartX = spotX - 44;
      if (anim.runupStyle === 'sprint_blast') runupStartX = spotX - 18;

      if (matchState === 'runup' || matchState === 'ball_flight' || matchState === 'shot_result') {
        const runupT = Math.min(1, anim.runup);
        strikerX = runupStartX + runupT * (spotX - runupStartX - 4);
        strikerY = spotY + 44 - runupT * 38;

        // Leg stride cycle
        legAngle = Math.sin(runupT * Math.PI * 2.6) * 0.85;
      }

      ctx.save();
      ctx.translate(strikerX, strikerY);

      // Striker Grass Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 36, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jersey Kit (Katika Emerald Kit vs Rivals Royal Blue)
      const kitColor = attackingTeam === 'A' ? '#059669' : '#1d4ed8';
      const kitTrim = attackingTeam === 'A' ? '#fef08a' : '#ffffff';

      // Torso
      ctx.fillStyle = kitColor;
      ctx.fillRect(-12, -28, 24, 34);

      // Gold Kit Number on Back
      ctx.fillStyle = kitTrim;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(currentShooter.number), 0, -8);

      // Striker Head
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(0, -38, 9, 0, Math.PI * 2);
      ctx.fill();

      // Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, 6, 20, 14);

      // Legs & Boots with run-up motion
      ctx.save();
      ctx.rotate(legAngle);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-6, 20, 5, 14);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-7, 33, 7, 5);
      ctx.restore();

      ctx.save();
      ctx.rotate(-legAngle * 0.7);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(2, 20, 5, 14);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(2, 33, 7, 5);
      ctx.restore();

      ctx.restore();

      // 8. ANIMATED 3D SOCCER BALL WITH PARABOLIC FLIGHT & SHADOW
      let ballX = spotX;
      let ballY = spotY;
      let ballScale = 1.0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const flightT = Math.min(1, anim.ballT);

        // Strict 3 directions target calculation
        let targetX = w / 2;
        if (anim.shotDir === 'left') targetX = goalX + goalW * 0.18;
        if (anim.shotDir === 'right') targetX = goalX + goalW * 0.82;

        let targetY = goalLineY - 26;
        if (anim.pitchElevation === 'low') targetY = goalLineY - 8;
        if (anim.pitchElevation === 'high') targetY = crossbarY + 12;
        if (anim.pitchElevation === 'panenka') targetY = crossbarY + 36;

        // If saved, deflect ball off keeper gloves
        if (!anim.scored && flightT > 0.8) {
          targetX = keeperX + (anim.diveDir === 'left' ? -12 : 12);
          targetY = keeperY + 6;
        }

        // Parabolic trajectory with elevation lift
        ballX = spotX + flightT * (targetX - spotX);
        const linearY = spotY + flightT * (targetY - spotY);
        const arcLift = Math.sin(flightT * Math.PI) * (anim.pitchElevation === 'panenka' ? 68 : 28);
        ballY = linearY - arcLift;

        // Perspective depth scaling (shrinks into the distance)
        ballScale = 1.0 - flightT * 0.52;
      }

      // Ball Shadow on Pitch
      const shadowY = spotY + (ballY - spotY) * 0.35;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ballX, ballY + 12 * ballScale, 10 * ballScale, 4 * ballScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball Sphere with 3D Shading
      const ballRadius = 9 * ballScale;
      ctx.save();
      ctx.translate(ballX, ballY);

      const ballGrad = ctx.createRadialGradient(-ballRadius * 0.3, -ballRadius * 0.3, 1, 0, 0, ballRadius);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.65, '#e2e8f0');
      ballGrad.addColorStop(1, '#334155');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Soccer Ball Hexagonal Centre Patch
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Animation Step Clock based on Procedural Power
      if (matchState === 'runup') {
        animProgressRef.current.runup += 0.055;
      } else if (matchState === 'ball_flight') {
        const speedFactor = (anim.powerKmH / 100) * 0.06;
        animProgressRef.current.ballT += speedFactor;
        animProgressRef.current.keeperT += 0.065;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [matchState, attackingTeam, currentShooter.number, userSelectedDir]);

  // Click on Canvas directly to choose direction during Aiming phase
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

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none">
      {/* ============================================================= */}
      {/* VIEW A: LOBBY & 3V3 MATCHMAKING CUE SCREEN                    */}
      {/* ============================================================= */}
      {matchState === 'lobby' ? (
        <div className="space-y-3 pt-2">
          {/* Header */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399]">
                    PvP STADIUM ARENA
                  </span>
                  <h1 className="text-lg font-black text-white">3v3 Penalty Shootout</h1>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-1 text-[11px] font-mono-custom text-[#35D399]">
                <Radio size={11} className="animate-pulse" />
                <span>CUE LIVE</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
              Multiplayer 3 vs 3 penalty shootout. Players join the cue and take turns shooting and saving! Strictly 3 directions (Left, Centre, Right).
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

          {/* Gameplay Mechanics Info Card */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1612] p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono-custom text-[#fef08a] font-bold text-[11px]">
              <Sparkles size={13} />
              <span>Shootout Rules &amp; Graphics</span>
            </div>
            <ul className="text-[11px] text-[#8FA39A] space-y-1 list-disc pl-4">
              <li><strong className="text-white">Strictly 3 Directions:</strong> Left, Centre, and Right.</li>
              <li><strong className="text-white">Randomized Telemetry:</strong> Varied shot power (75–124 km/h), pitch elevations (low, mid, high, panenka), and dynamic player motions.</li>
              <li><strong className="text-white">Take Turns:</strong> Each player in the 3v3 squad steps up to shoot as striker and defends as goalkeeper!</li>
            </ul>
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
              <span>Instant Squad Kickoff (Practice) →</span>
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

          {/* Connected Players Bar */}
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
            Stadium Ready · 6 Players Connected
          </span>
          <div className="font-mono-custom text-7xl font-black text-[#fef08a] animate-ping">
            {countdownNum}
          </div>
          <p className="font-mono-custom text-sm font-bold text-white">GET READY TO SHOOT &amp; SAVE</p>
        </div>
      ) : (
        /* ============================================================= */
        /* VIEW D: LIVE MATCH ARENA (SCOREBOARD, CANVAS, CONTROLLER)     */
        /* ============================================================= */
        <>
          {/* BROADCAST TOP SCOREBOARD */}
          <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-3 shadow-2xl">
            <div className="flex items-center justify-between">
              {/* Team A (Katika Elite) */}
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#064e3b] p-1 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    KATIKA
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {shotsA.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#35d399]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#475569]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Central Live Score Display */}
              <div className="text-center px-4 py-1 rounded-xl bg-black/60 border border-[#1C3A2E] shadow-inner">
                <div className="font-mono-custom text-xl font-black text-[#fef08a] tracking-widest">
                  {scoreTeamA} - {scoreTeamB}
                </div>
                <span className="font-mono-custom text-[8px] font-bold uppercase tracking-widest text-[#35D399]">
                  ROUND {currentRound} / 3
                </span>
              </div>

              {/* Team B (Rivals) */}
              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    RIVALS
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {shotsB.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#35d399]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#475569]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#1e3a8a] text-xs font-black text-white border border-blue-400/40 shadow-sm">
                  WHU
                </div>
              </div>
            </div>

            {/* Dynamic Telemetric Banner Notice */}
            <div className="mt-2.5 flex items-center justify-between border-t border-[#1C3A2E] pt-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-mono-custom text-[#8FA39A]">
                <Gauge size={12} className="text-[#fef08a]" />
                <span>KICKER: {currentShooter.name} vs KEEPER: {currentKeeper.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center gap-1 text-[#8FA39A] hover:text-white"
              >
                {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>

          {/* 3D PENALTY CANVAS ARENA */}
          <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-[#1C3A2E] bg-black shadow-2xl">
            <canvas
              ref={canvasRef}
              width={480}
              height={380}
              onClick={handleCanvasClick}
              className="h-full w-full object-cover cursor-pointer"
            />

            {/* Broadcast Notice Banner */}
            {bannerNotice && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#fef08a]/60 bg-black/80 px-4 py-1 font-mono-custom text-[11px] font-black tracking-wider text-[#fef08a] shadow-lg animate-fade-in backdrop-blur-sm">
                {bannerNotice}
              </div>
            )}

            {/* In-Game Active Shot Telemetry Overlay */}
            {activeShotData && matchState === 'shot_result' && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-[#35D399]/60 bg-black/90 px-4 py-2 font-mono-custom text-xs shadow-2xl backdrop-blur-md">
                <span className="font-bold text-[#fef08a]">{activeShotData.powerKmH} KM/H</span>
                <span className="text-white/40">|</span>
                <span className="font-bold uppercase text-[#35D399]">{activeShotData.pitchElevation}</span>
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
                      ? '🎯 Choose Kick Direction (3 Options):'
                      : isUserTurnToSave
                      ? '🧤 Choose Goalkeeper Dive Direction:'
                      : `Watching ${currentShooter.name}...`}
                  </span>
                  <span className="font-mono-custom text-[10px] text-[#35D399]">
                    {isUserTurnToShoot ? 'Striker Turn' : isUserTurnToSave ? 'Keeper Turn' : 'Squadmate Turn'}
                  </span>
                </div>

                {/* THE 3 DIRECTIONAL TARGET BUTTONS */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserChoice('left')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronLeft size={26} className="text-[#35D399] group-hover:-translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      LEFT
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Post / Corner' : 'Dive Left'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('centre')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#fef08a] hover:bg-[#fef08a]/15 active:scale-95 shadow-lg"
                  >
                    <Zap size={26} className="text-[#fef08a] group-hover:scale-110 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      CENTRE
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Middle / Chip' : 'Hold Ground'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('right')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronRight size={26} className="text-[#35D399] group-hover:translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      RIGHT
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Post / Corner' : 'Dive Right'}
                    </span>
                  </button>
                </div>
              </div>
            ) : matchState === 'game_over' ? (
              <div className="rounded-3xl border border-[#d4af37]/60 bg-[#091712] p-5 text-center shadow-2xl animate-fade-in">
                <Trophy size={40} className="mx-auto text-[#fef08a] animate-bounce" />
                <h3 className="mt-2 text-xl font-black text-white">Shootout Concluded!</h3>
                <p className="font-mono-custom text-base font-bold text-[#35D399]">
                  Final Score: {scoreTeamA} - {scoreTeamB}
                </p>
                <p className="mt-1 text-xs text-[#8FA39A]">
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
                    className="rounded-xl border border-[#1C3A2E] bg-black/40 px-4 py-3 font-mono-custom text-xs font-bold text-[#8FA39A] hover:text-white"
                  >
                    PvP Floor
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] py-4 text-center font-mono-custom text-xs text-[#8FA39A]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fef08a] animate-ping" />
                <span>Kick in flight · Resolving strike...</span>
              </div>
            )}
          </div>

          {/* 3 VS 3 ROSTER PREVIEW STRIP */}
          <div className="mt-3 rounded-2xl border border-[#1C3A2E] bg-[#0A1612] p-3">
            <div className="flex items-center justify-between text-[10px] font-mono-custom text-[#8FA39A] uppercase tracking-wider mb-2">
              <span>3v3 Squad Lineup</span>
              <span className="text-[#35D399]">Taking Turns: Shoot &amp; Save</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Team A Lineup */}
              <div className="rounded-xl border border-[#1C3A2E]/80 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-[#35D399] uppercase">
                  Katika Elite
                </span>
                {teamA.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'A'
                        ? 'bg-[#35D399]/20 font-bold text-white'
                        : 'text-[#8FA39A]'
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
              <div className="rounded-xl border border-[#1C3A2E]/80 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-blue-400 uppercase">
                  Rivals Squad
                </span>
                {teamB.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'B'
                        ? 'bg-blue-500/20 font-bold text-white'
                        : 'text-[#8FA39A]'
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
