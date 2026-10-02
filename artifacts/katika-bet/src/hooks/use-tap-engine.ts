import { useState, useEffect, useCallback, useRef } from 'react';
import { triggerHaptic, triggerHapticNotification, getTelegramUser } from '@/lib/telegram';
import { fireWinConfetti } from '@/lib/confetti';

export interface TapTask {
  id: string;
  title: string;
  desc: string;
  reward: number;
  icon: string;
  type: 'social' | 'game' | 'streak';
  actionUrl?: string;
  completed: boolean;
}

export interface TapState {
  points: number;
  totalEarned: number;
  energy: number;
  maxEnergy: number;
  multitapLevel: number;
  energyLevel: number;
  regenLevel: number;
  autoBotUnlocked: boolean;
  dailyRefillsLeft: number;
  lastRefillDate: string;
  lastActiveTime: number;
  claimedTasks: string[];
  streakDays: number;
  lastCheckInDate: string;
}

const STORAGE_KEY = 'katika_tap_v1';
const TODAY_STR = () => new Date().toISOString().split('T')[0];

const INITIAL_STATE: TapState = {
  points: 2500, // Welcome gift
  totalEarned: 2500,
  energy: 1000,
  maxEnergy: 1000,
  multitapLevel: 1,
  energyLevel: 1,
  regenLevel: 1,
  autoBotUnlocked: false,
  dailyRefillsLeft: 3,
  lastRefillDate: TODAY_STR(),
  lastActiveTime: Date.now(),
  claimedTasks: [],
  streakDays: 0,
  lastCheckInDate: '',
};

export function useTapEngine() {
  const [state, setState] = useState<TapState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reset daily refills if new day
        if (parsed.lastRefillDate !== TODAY_STR()) {
          parsed.dailyRefillsLeft = 3;
          parsed.lastRefillDate = TODAY_STR();
        }
        return { ...INITIAL_STATE, ...parsed };
      }
    } catch {
      // Ignored
    }
    return INITIAL_STATE;
  });

  const [offlineBonus, setOfflineBonus] = useState<number | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignored
    }
  }, [state]);

  // Offline farming calculation on mount
  useEffect(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - state.lastActiveTime) / 1000);
    // If user was away for more than 60s
    if (elapsedSeconds > 60) {
      // Calculate max offline time (capped at 3 hours = 10,800s)
      const cappedSeconds = Math.min(elapsedSeconds, 3 * 3600);
      // If auto-bot unlocked, earns 2 pts/sec; otherwise base 0.5 pts/sec
      const ptsPerSec = state.autoBotUnlocked ? 2.5 : 0.6;
      const farmed = Math.floor(cappedSeconds * ptsPerSec);
      if (farmed > 50) {
        setOfflineBonus(farmed);
      }
    }
  }, []);

  // Energy Regeneration ticker (+X energy per second)
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const maxE = 1000 + (prev.energyLevel - 1) * 500;
        const regenRate = 2 + (prev.regenLevel - 1);
        if (prev.energy >= maxE) return prev;
        const newEnergy = Math.min(maxE, prev.energy + regenRate);
        return {
          ...prev,
          energy: newEnergy,
          maxEnergy: maxE,
          lastActiveTime: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Tap handler (multi-touch supported)
  const handleTap = useCallback((tapCount = 1) => {
    setState((prev) => {
      const tapPower = prev.multitapLevel;
      const energyNeeded = tapPower * tapCount;
      if (prev.energy <= 0) {
        triggerHaptic('light');
        return prev;
      }

      // Can only tap as much energy as available
      const actualTaps = Math.min(tapCount, Math.floor(prev.energy / tapPower));
      if (actualTaps <= 0) return prev;

      const pointsEarned = actualTaps * tapPower;
      const energyCost = actualTaps * tapPower;

      triggerHaptic('medium');

      return {
        ...prev,
        points: prev.points + pointsEarned,
        totalEarned: prev.totalEarned + pointsEarned,
        energy: Math.max(0, prev.energy - energyCost),
        lastActiveTime: Date.now(),
      };
    });
  }, []);

  // Claim offline farming reward
  const claimOfflineReward = useCallback(() => {
    if (!offlineBonus) return;
    setState((prev) => ({
      ...prev,
      points: prev.points + offlineBonus,
      totalEarned: prev.totalEarned + offlineBonus,
      lastActiveTime: Date.now(),
    }));
    fireWinConfetti();
    triggerHapticNotification('success');
    setOfflineBonus(null);
  }, [offlineBonus]);

  // Use full energy refill booster
  const useEnergyRefill = useCallback(() => {
    if (state.dailyRefillsLeft <= 0) return false;
    setState((prev) => ({
      ...prev,
      energy: prev.maxEnergy,
      dailyRefillsLeft: prev.dailyRefillsLeft - 1,
      lastActiveTime: Date.now(),
    }));
    triggerHapticNotification('success');
    return true;
  }, [state.dailyRefillsLeft]);

  // Upgrades
  const getUpgradeCost = (type: 'multitap' | 'energy' | 'regen' | 'bot') => {
    switch (type) {
      case 'multitap':
        return Math.floor(1000 * Math.pow(1.8, state.multitapLevel - 1));
      case 'energy':
        return Math.floor(1200 * Math.pow(1.7, state.energyLevel - 1));
      case 'regen':
        return Math.floor(1500 * Math.pow(2.0, state.regenLevel - 1));
      case 'bot':
        return 15000;
    }
  };

  const buyUpgrade = useCallback((type: 'multitap' | 'energy' | 'regen' | 'bot') => {
    const cost = getUpgradeCost(type);
    if (state.points < cost) return { success: false, reason: 'Not enough points' };

    setState((prev) => {
      const next = { ...prev, points: prev.points - cost };
      if (type === 'multitap') next.multitapLevel += 1;
      if (type === 'energy') {
        next.energyLevel += 1;
        next.maxEnergy = 1000 + (next.energyLevel - 1) * 500;
        next.energy = next.maxEnergy;
      }
      if (type === 'regen') next.regenLevel += 1;
      if (type === 'bot') next.autoBotUnlocked = true;
      return next;
    });

    triggerHapticNotification('success');
    return { success: true };
  }, [state.points, state.multitapLevel, state.energyLevel, state.regenLevel]);

  // Swap Points for $KTK
  const swapPointsForKtk = useCallback(async (pointsToSwap: number, getAccessToken?: () => Promise<string | null>) => {
    if (pointsToSwap < 100 || pointsToSwap > state.points) {
      return { success: false, error: 'Invalid swap amount' };
    }

    setIsSwapping(true);
    try {
      let token: string | null = null;
      if (getAccessToken) {
        token = await getAccessToken().catch(() => null);
      }
      const tgUser = getTelegramUser();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/tap/swap', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          points: pointsToSwap,
          telegramId: tgUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Swap failed' };
      }

      // Deduct swapped points
      setState((prev) => ({
        ...prev,
        points: Math.max(0, prev.points - pointsToSwap),
        lastActiveTime: Date.now(),
      }));

      fireWinConfetti();
      triggerHapticNotification('success');

      return {
        success: true,
        ktkCredited: data.ktkCredited,
        message: data.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    } finally {
      setIsSwapping(false);
    }
  }, [state.points]);

  // Daily Check-in Streak
  const claimDailyCheckIn = useCallback(() => {
    const today = TODAY_STR();
    if (state.lastCheckInDate === today) return { success: false, message: 'Already claimed today' };

    const newStreak = state.streakDays >= 7 ? 1 : state.streakDays + 1;
    // Ladder rewards: 500, 1000, 2000, 3500, 5000, 7500, 15000
    const rewards = [500, 1000, 2000, 3500, 5000, 7500, 15000];
    const reward = rewards[newStreak - 1] || 500;

    setState((prev) => ({
      ...prev,
      points: prev.points + reward,
      totalEarned: prev.totalEarned + reward,
      streakDays: newStreak,
      lastCheckInDate: today,
      lastActiveTime: Date.now(),
    }));

    fireWinConfetti();
    triggerHapticNotification('success');
    return { success: true, reward, streak: newStreak };
  }, [state.lastCheckInDate, state.streakDays]);

  // Tasks & Quests
  const claimTask = useCallback((taskId: string, reward: number) => {
    if (state.claimedTasks.includes(taskId)) return false;

    setState((prev) => ({
      ...prev,
      points: prev.points + reward,
      totalEarned: prev.totalEarned + reward,
      claimedTasks: [...prev.claimedTasks, taskId],
      lastActiveTime: Date.now(),
    }));

    fireWinConfetti();
    triggerHapticNotification('success');
    return true;
  }, [state.claimedTasks]);

  return {
    state,
    offlineBonus,
    isSwapping,
    handleTap,
    claimOfflineReward,
    useEnergyRefill,
    getUpgradeCost,
    buyUpgrade,
    swapPointsForKtk,
    claimDailyCheckIn,
    claimTask,
  };
}
