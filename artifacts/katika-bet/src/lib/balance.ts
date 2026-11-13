import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const WALLET_BALANCE_EVENT = 'sidebet:balance-updated';

function balanceStorageKey(userId: string) {
  return `sidebet_balance:${userId}`;
}

export function getWalletBalance(userId?: string | null): number {
  if (!userId) return 0;
  try {
    const raw = localStorage.getItem(balanceStorageKey(userId));
    if (raw === null) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

export function setWalletBalance(userId: string | undefined | null, amount: number): number {
  const safe = Number.isFinite(amount) ? Math.max(0, Number(amount.toFixed(2))) : 0;
  if (!userId) return 0;
  try {
    localStorage.setItem(balanceStorageKey(userId), safe.toFixed(2));
    window.dispatchEvent(new Event(WALLET_BALANCE_EVENT));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to persist wallet balance:', err);
  }
  return safe;
}

export function useUserWalletBalance() {
  const { ready, authenticated, user } = usePrivy();
  const userId = authenticated ? user?.id : undefined;

  const [balance, setLocalBalance] = useState<number>(() => getWalletBalance(userId));

  useEffect(() => {
    const sync = () => {
      setLocalBalance(getWalletBalance(userId));
    };
    sync();
    window.addEventListener(WALLET_BALANCE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(WALLET_BALANCE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const updateBalance = useCallback(
    (nextAmount: number) => {
      const saved = setWalletBalance(userId, nextAmount);
      setLocalBalance(saved);
      return saved;
    },
    [userId]
  );

  return {
    balance: authenticated && userId ? balance : 0,
    setBalance: updateBalance,
    ready,
    authenticated,
    userId,
  };
}
