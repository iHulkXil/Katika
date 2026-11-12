export type Market = {
  id: string;
  title: string;
  description?: string;
  category: string;
  yesShares: number;
  noShares: number;
  liquidity: number;
  volume: number;
  endsAt: string;
  status: 'open' | 'resolved';
  resolution: 'YES' | 'NO' | null;
  creator: string;
  icon?: string;
  createdAt?: string;
  resolvedAt?: string | null;
};

export type Position = {
  id: string;
  userId?: string;
  walletAddress?: string;
  marketId: string;
  title: string;
  side: 'YES' | 'NO';
  amount: number; // in SOL
  odds: number;
  status: 'open' | 'won' | 'lost' | 'claimed';
  payout: number;
  txSig?: string;
  placedAt: string;
};

export type PlatformStats = {
  totalMarkets: number;
  openMarkets: number;
  resolvedMarkets: number;
  totalVolume: number;
  totalLiquidity: number;
  totalPositions: number;
  activeTradersCount: number;
};

// Calculate probability and decimal odds from AMM shares
export function calcOdds(yes: number, no: number) {
  const total = (yes || 0) + (no || 0) || 1;
  const yesProb = Math.max(0.01, Math.min(0.99, yes / total));
  return {
    yes: (1 / yesProb).toFixed(2),
    no: (1 / (1 - yesProb)).toFixed(2),
    yesPct: Math.round(yesProb * 100),
  };
}

export async function fetchMarkets(category?: string, search?: string): Promise<Market[]> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`/api/markets?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.markets)) {
        return data.markets;
      }
    }
  } catch (err) {
    console.warn('Backend /api/markets unreachable, using cached state:', err);
  }

  // Local storage fallback if offline
  const local = localStorage.getItem('sidebet_cached_markets');
  if (local) {
    try {
      return JSON.parse(local);
    } catch {}
  }
  return [];
}

export async function fetchMarketById(id: string): Promise<{ market: Market; recentOrders: Position[] } | null> {
  try {
    const res = await fetch(`/api/markets/${id}`);
    if (res.ok) {
      const data = await res.json();
      return { market: data.market, recentOrders: data.recentOrders || [] };
    }
  } catch (err) {
    console.warn(`Failed to fetch market ${id}:`, err);
  }
  return null;
}

export async function createMarket(input: {
  title: string;
  category: string;
  description?: string;
  initialLiquidity?: number;
  creator?: string;
}): Promise<Market> {
  const res = await fetch('/api/markets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create market');
  }

  const data = await res.json();
  return data.market;
}

export async function resolveMarket(marketId: string, resolution: 'YES' | 'NO'): Promise<{ market: Market; stats: any }> {
  const res = await fetch(`/api/markets/${marketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to resolve market');
  }

  return await res.json();
}

export async function fetchPositions(walletAddress?: string): Promise<Position[]> {
  try {
    const params = new URLSearchParams();
    if (walletAddress) params.append('walletAddress', walletAddress);

    const res = await fetch(`/api/positions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.positions)) {
        return data.positions;
      }
    }
  } catch (err) {
    console.warn('Backend /api/positions unreachable:', err);
  }

  const local = localStorage.getItem('sidebet_positions');
  if (local) {
    try {
      return JSON.parse(local);
    } catch {}
  }
  return [];
}

export async function placeStake(input: {
  marketId: string;
  side: 'YES' | 'NO';
  amount: number;
  odds: number;
  walletAddress?: string;
  txSig?: string;
}): Promise<{ position: Position; market: Market }> {
  const res = await fetch('/api/positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to place stake');
  }

  const data = await res.json();

  // Also cache locally in client positions
  try {
    const raw = localStorage.getItem('sidebet_positions') || '[]';
    const list: Position[] = JSON.parse(raw);
    list.unshift(data.position);
    localStorage.setItem('sidebet_positions', JSON.stringify(list.slice(0, 50)));
  } catch {}

  return data;
}

export async function claimWinnings(positionId: string): Promise<number> {
  const res = await fetch(`/api/positions/${positionId}/claim`, {
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to claim position');
  }

  const data = await res.json();
  return data.claimedAmount;
}

export async function fetchStats(): Promise<PlatformStats> {
  try {
    const res = await fetch('/api/stats/overview');
    if (res.ok) {
      const data = await res.json();
      return data.stats;
    }
  } catch (err) {
    console.warn('Failed to fetch stats:', err);
  }

  return {
    totalMarkets: 8,
    openMarkets: 8,
    resolvedMarkets: 0,
    totalVolume: 1660200,
    totalLiquidity: 340,
    totalPositions: 0,
    activeTradersCount: 1248,
  };
}
