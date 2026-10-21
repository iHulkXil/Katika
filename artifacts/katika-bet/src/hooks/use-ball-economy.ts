import { useState, useEffect, useCallback, useRef } from 'react';
import { triggerHaptic, triggerHapticNotification } from '@/lib/telegram';
import { fireWinConfetti } from '@/lib/confetti';

export const MAX_DAILY_BALLS = 3;
export const POINTS_PER_BALL = 500;
const STORAGE_KEY = 'katika_ball_mining_v1';
const BALL_UPDATE_EVENT = 'katika-ball-updated';

export interface MiningTask {
  id: string;
  title: string;
  desc: string;
  reward: number;
  icon: string;
  type: 'hardware' | 'social' | 'streak';
  completed: boolean;
}

export interface BallEconomyState {
  balls: number;
  ballsMinedToday: number;
  lastMinedDate: string;
  minedPoints: number;
  totalPointsMined: number;
  hashRate: number; // in MH/s
  rigLevel: number;
  coolingLevel: number;
  autoBotUnlocked: boolean;
  temperature: number; // in Celsius
  lastActiveTime: number;
  claimedTasks: string[];
  streakDays: number;
  lastCheckInDate: string;
}

const getTodayUtc = () => new Date().toISOString().split('T')[0];

const INITIAL_STATE: BallEconomyState = {
  balls: 3, // Initial starter balls so players can test games immediately
  ballsMinedToday: 0,
  lastMinedDate: getTodayUtc(),
  minedPoints: 350, // Starter mining points towards next ball
  totalPointsMined: 350,
  hashRate: 48,
  rigLevel: 1,
  coolingLevel: 1,
  autoBotUnlocked: false,
  temperature: 42,
  lastActiveTime: Date.now(),
  claimedTasks: [],
  streakDays: 0,
  lastCheckInDate: '',
};

function dispatchBallUpdate(balls: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BALL_UPDATE_EVENT, { detail: { balls } }));
  }
}

export function useBallEconomy() {
  const [state, setState] = useState<BallEconomyState>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const today = getTodayUtc();
          // Reset daily balls count if new calendar day
          if (parsed.lastMinedDate !== today) {
            parsed.ballsMinedToday = 0;
            parsed.lastMinedDate = today;
          }
          return { ...INITIAL_STATE, ...parsed };
        }
      }
    } catch {
      // Ignored
    }
    return INITIAL_STATE;
  });

  const [isMinting, setIsMinting] = useState(false);
  const [overclockActive, setOverclockActive] = useState(false);
  const [offlineYield, setOfflineYield] = useState<number | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Listen to external ball balance updates across windows/components
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail?.balls !== undefined && e.detail.balls !== state.balls) {
        setState((prev) => ({ ...prev, balls: e.detail.balls }));
      }
    };
    window.addEventListener(BALL_UPDATE_EVENT, handleSync);
    return () => window.removeEventListener(BALL_UPDATE_EVENT, handleSync);
  }, [state.balls]);

  // Calculate offline mining yield on mount
  useEffect(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - state.lastActiveTime) / 1000);
    if (elapsedSeconds > 30) {
      // Cap at 4 hours = 14400s
      const cappedSeconds = Math.min(elapsedSeconds, 4 * 3600);
      const ratePerSec = state.autoBotUnlocked ? 1.8 : 0.45;
      const farmed = Math.floor(cappedSeconds * ratePerSec);
      if (farmed > 25) {
        setOfflineYield(farmed);
      }
    }
  }, []);

  // Continuous background mining loop (ticks every 1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const today = getTodayUtc();
        let minedToday = prev.ballsMinedToday;
        if (prev.lastMinedDate !== today) {
          minedToday = 0;
        }

        // Base mining rate calculated from hashrate
        const ptsPerSec = Math.max(1, Math.floor(prev.hashRate / 10));
        const newPoints = prev.minedPoints + ptsPerSec;

        // Cooling dissipation towards 40C
        const targetTemp = 40 + (prev.rigLevel - 1) * 2;
        const coolRate = 0.5 * prev.coolingLevel;
        const newTemp = Math.max(targetTemp, prev.temperature - coolRate);

        return {
          ...prev,
          minedPoints: newPoints,
          totalPointsMined: prev.totalPointsMined + ptsPerSec,
          temperature: Math.round(newTemp),
          ballsMinedToday: minedToday,
          lastMinedDate: today,
          lastActiveTime: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Active Overclock Pulse (user clicks or holds to turbocharge mining)
  const pulseMine = useCallback(() => {
    setOverclockActive(true);
    triggerHaptic('medium');

    setState((prev) => {
      const bonusPts = Math.floor(12 + Math.random() * 14 + prev.rigLevel * 2);
      const newTemp = Math.min(88, prev.temperature + 2.5);
      return {
        ...prev,
        minedPoints: prev.minedPoints + bonusPts,
        totalPointsMined: prev.totalPointsMined + bonusPts,
        temperature: Math.round(newTemp),
        lastActiveTime: Date.now(),
      };
    });

    setTimeout(() => {
      setOverclockActive(false);
    }, 350);
  }, []);

  // Claim offline mining yield
  const claimOfflineYield = useCallback(() => {
    if (!offlineYield) return;
    setState((prev) => ({
      ...prev,
      minedPoints: prev.minedPoints + offlineYield,
      totalPointsMined: prev.totalPointsMined + offlineYield,
      lastActiveTime: Date.now(),
    }));
    fireWinConfetti();
    triggerHapticNotification('success');
    setOfflineYield(null);
  }, [offlineYield]);

  // Mint 1 $BALL using mined points (Strictly enforces max 3 daily)
  const mintBall = useCallback(async () => {
    const today = getTodayUtc();

    if (state.lastMinedDate === today && state.ballsMinedToday >= MAX_DAILY_BALLS) {
      return {
        success: false,
        error: `Daily limit reached! Maximum ${MAX_DAILY_BALLS} $BALL can be mined per day. Resets at 00:00 UTC.`,
      };
    }

    if (state.minedPoints < POINTS_PER_BALL) {
      return {
        success: false,
        error: `Need ${POINTS_PER_BALL} mined points to mint 1 $BALL. (Current: ${state.minedPoints} PTS)`,
      };
    }

    setIsMinting(true);
    try {
      // Also notify backend API
      try {
        await fetch('/api/ball/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: state.minedPoints }),
        });
      } catch {}

      const newBalls = state.balls + 1;
      const newMinedToday = (state.lastMinedDate === today ? state.ballsMinedToday : 0) + 1;

      setState((prev) => ({
        ...prev,
        balls: newBalls,
        ballsMinedToday: newMinedToday,
        lastMinedDate: today,
        minedPoints: Math.max(0, prev.minedPoints - POINTS_PER_BALL),
        lastActiveTime: Date.now(),
      }));

      dispatchBallUpdate(newBalls);
      fireWinConfetti();
      triggerHapticNotification('success');

      return {
        success: true,
        balls: newBalls,
        ballsMinedToday: newMinedToday,
        remainingDaily: MAX_DAILY_BALLS - newMinedToday,
      };
    } finally {
      setIsMinting(false);
    }
  }, [state.balls, state.ballsMinedToday, state.lastMinedDate, state.minedPoints]);

  // Consume 1 $BALL to start/play any game on the platform
  const consumeBall = useCallback(
    async (gameName = 'Game') => {
      if (state.balls < 1) {
        triggerHapticNotification('warning');
        return {
          success: false,
          error: `You need at least 1 $BALL token to play ${gameName}. Mine points in the Mining Station to mint up to 3 $BALL daily!`,
          balls: state.balls,
        };
      }

      const nextBalls = state.balls - 1;
      setState((prev) => ({
        ...prev,
        balls: nextBalls,
        lastActiveTime: Date.now(),
      }));

      dispatchBallUpdate(nextBalls);
      triggerHaptic('light');

      // Sync with backend API
      try {
        await fetch('/api/ball/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: gameName }),
        });
      } catch {}

      return {
        success: true,
        remaining: nextBalls,
      };
    },
    [state.balls]
  );

  // Upgrade Mining Hardware
  const getUpgradeCost = (type: 'processor' | 'cooling' | 'bot') => {
    switch (type) {
      case 'processor':
        return Math.floor(400 * Math.pow(1.8, state.rigLevel - 1));
      case 'cooling':
        return Math.floor(350 * Math.pow(1.7, state.coolingLevel - 1));
      case 'bot':
        return 3500;
    }
  };

  const buyUpgrade = useCallback(
    (type: 'processor' | 'cooling' | 'bot') => {
      const cost = getUpgradeCost(type);
      if (state.minedPoints < cost) {
        return { success: false, reason: 'Not enough points' };
      }

      setState((prev) => {
        const next = { ...prev, minedPoints: prev.minedPoints - cost };
        if (type === 'processor') {
          next.rigLevel += 1;
          next.hashRate += 24;
        } else if (type === 'cooling') {
          next.coolingLevel += 1;
        } else if (type === 'bot') {
          next.autoBotUnlocked = true;
        }
        return next;
      });

      triggerHapticNotification('success');
      return { success: true };
    },
    [state.minedPoints, state.rigLevel, state.coolingLevel]
  );

  // Daily Streak Claim
  const claimDailyCheckIn = useCallback(() => {
    const today = getTodayUtc();
    if (state.lastCheckInDate === today) return { success: false, message: 'Already claimed today' };

    const newStreak = state.streakDays >= 7 ? 1 : state.streakDays + 1;
    const rewards = [200, 350, 500, 750, 1000, 1500, 2500];
    const reward = rewards[newStreak - 1] || 250;

    setState((prev) => ({
      ...prev,
      minedPoints: prev.minedPoints + reward,
      totalPointsMined: prev.totalPointsMined + reward,
      streakDays: newStreak,
      lastCheckInDate: today,
      lastActiveTime: Date.now(),
    }));

    fireWinConfetti();
    triggerHapticNotification('success');
    return { success: true, reward, streak: newStreak };
  }, [state.lastCheckInDate, state.streakDays]);

  // Task Bounty Claim
  const claimTask = useCallback(
    (taskId: string, reward: number) => {
      if (state.claimedTasks.includes(taskId)) return false;

      setState((prev) => ({
        ...prev,
        minedPoints: prev.minedPoints + reward,
        totalPointsMined: prev.totalPointsMined + reward,
        claimedTasks: [...prev.claimedTasks, taskId],
        lastActiveTime: Date.now(),
      }));

      fireWinConfetti();
      triggerHapticNotification('success');
      return true;
    },
    [state.claimedTasks]
  );

  return {
    state,
    isMinting,
    overclockActive,
    offlineYield,
    pulseMine,
    claimOfflineYield,
    mintBall,
    consumeBall,
    getUpgradeCost,
    buyUpgrade,
    claimDailyCheckIn,
    claimTask,
  };
}
