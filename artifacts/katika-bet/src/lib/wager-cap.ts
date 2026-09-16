export const BASE_MAX_WAGER = 50;

export function tableMaxWager(serverMax?: number | null) {
  const cap = Number(serverMax);
  return Number.isFinite(cap) && cap >= 10 ? cap : BASE_MAX_WAGER;
}

export function clampStake(wager: number, maxWager: number, balance: number) {
  const cap = Math.min(tableMaxWager(maxWager), Math.max(10, Number(balance) || 0));
  const next = Math.round(Number(wager) || 10);
  return Math.min(cap, Math.max(10, next));
}
