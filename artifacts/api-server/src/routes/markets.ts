import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

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
  status: "open" | "resolved";
  resolution: "YES" | "NO" | null;
  creator: string;
  icon?: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type Position = {
  id: string;
  userId: string;
  walletAddress?: string;
  marketId: string;
  title: string;
  side: "YES" | "NO";
  amount: number; // in SOL
  odds: number;
  status: "open" | "won" | "lost" | "claimed";
  payout: number;
  txSig?: string;
  placedAt: string;
};

// Seed Initial Nigerian Politics, Crypto, Sports, and Finance Markets
const INITIAL_MARKETS: Market[] = [
  {
    id: "obi-shake",
    title: "Will Peter Obi publicly shake hands with Bola Tinubu before election day?",
    description: "Resolves YES if credible national media (Punch, Channels TV, Premium Times) verifies an in-person public handshake between Peter Obi and President Bola Tinubu before the 2027 election cycle.",
    category: "Politics",
    yesShares: 4200,
    noShares: 5800,
    liquidity: 50,
    volume: 124500,
    endsAt: "2027",
    status: "open",
    resolution: null,
    creator: "Sidebet Foundation",
    icon: "obi",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "regina",
    title: "Will Regina Daniels reconcile with Ned Nwoko before the end of 2027?",
    description: "Resolves YES if verified joint public statements or photographic proof confirm full reconciliation before December 31, 2027.",
    category: "Politics",
    yesShares: 3100,
    noShares: 6900,
    liquidity: 30,
    volume: 89200,
    endsAt: "2027",
    status: "open",
    resolution: null,
    creator: "Sidebet Foundation",
    icon: "regina",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "obi-energy",
    title: "Will Peter Obi say Tinubu lacks energy to lead Nigeria again this month?",
    description: "Resolves YES if Peter Obi explicitly references Tinubu's physical or governance energy in a public press conference or official Twitter statement this month.",
    category: "Politics",
    yesShares: 6800,
    noShares: 3200,
    liquidity: 40,
    volume: 210400,
    endsAt: "Nov 30",
    status: "open",
    resolution: null,
    creator: "Sidebet Foundation",
    icon: "obi",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "coalition",
    title: "Will an opposition coalition form against Tinubu before 2027 primaries?",
    description: "Resolves YES if an official joint alliance communiqué is formally ratified by LP, PDP, and NNPP representatives.",
    category: "Politics",
    yesShares: 5500,
    noShares: 4500,
    liquidity: 60,
    volume: 156800,
    endsAt: "2026",
    status: "open",
    resolution: null,
    creator: "Sidebet Foundation",
    icon: "coalition",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "btc15",
    title: "BTC price above $92,000 at end of the 4-hour settlement candle?",
    description: "Resolves YES if the Binance / Coinbase 4-hour close price for BTC/USDT prints at or above $92,000.00.",
    category: "Crypto",
    yesShares: 6200,
    noShares: 3800,
    liquidity: 20,
    volume: 45200,
    endsAt: "4h",
    status: "open",
    resolution: null,
    creator: "CryptoDesk",
    icon: "btc",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "sol15",
    title: "SOL price breaks $160 before Friday close on Solana Mainnet?",
    description: "Resolves YES if Pyth Network / Raydium oracle records SOL/USD reaching $160.00 before 23:59 UTC Friday.",
    category: "Crypto",
    yesShares: 5400,
    noShares: 4600,
    liquidity: 15,
    volume: 32100,
    endsAt: "48h",
    status: "open",
    resolution: null,
    creator: "Solana Alpha",
    icon: "sol",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "arsenal",
    title: "Will Arsenal win the Premier League 2026/27 title race?",
    description: "Resolves YES if Arsenal Football Club is officially crowned Premier League Champions by the FA.",
    category: "Sports",
    yesShares: 7200,
    noShares: 2800,
    liquidity: 80,
    volume: 890000,
    endsAt: "May 2027",
    status: "open",
    resolution: null,
    creator: "SportsDesk",
    icon: "arsenal",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
  {
    id: "cbn-rate",
    title: "Will Central Bank of Nigeria cut MPR below 26% this quarter?",
    description: "Resolves YES if the Monetary Policy Committee announces an MPR reduction strictly below 26.00% at the upcoming rate announcement.",
    category: "Finance",
    yesShares: 4800,
    noShares: 5200,
    liquidity: 45,
    volume: 112000,
    endsAt: "Q4",
    status: "open",
    resolution: null,
    creator: "EconLab",
    icon: "econ",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  },
];

// Persistent File Storage Path
const DATA_DIR = path.resolve(process.cwd(), ".data");
const MARKETS_FILE = path.join(DATA_DIR, "sidebet_markets.json");
const POSITIONS_FILE = path.join(DATA_DIR, "sidebet_positions.json");

// In-Memory caches backed by JSON files
let marketsMap = new Map<string, Market>();
let positionsList: Position[] = [];

// Load state from file or seed
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(MARKETS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MARKETS_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        marketsMap = new Map(data.map((m: Market) => [m.id, m]));
      }
    }

    // Seed if empty
    if (marketsMap.size === 0) {
      INITIAL_MARKETS.forEach((m) => marketsMap.set(m.id, m));
      persistMarkets();
    }

    if (fs.existsSync(POSITIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(POSITIONS_FILE, "utf-8"));
      if (Array.isArray(data)) {
        positionsList = data;
      }
    }
  } catch (err) {
    console.error("Error initializing market store:", err);
    INITIAL_MARKETS.forEach((m) => marketsMap.set(m.id, m));
  }
}

function persistMarkets() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(MARKETS_FILE, JSON.stringify(Array.from(marketsMap.values()), null, 2));
  } catch (err) {
    console.error("Failed to persist markets:", err);
  }
}

function persistPositions() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positionsList, null, 2));
  } catch (err) {
    console.error("Failed to persist positions:", err);
  }
}

initStore();

/* ==========================================================================
   MARKET ROUTES
   ========================================================================== */

// 1. GET /api/markets
router.get("/markets", (req: Request, res: Response) => {
  const { category, status, search } = req.query;
  let all = Array.from(marketsMap.values());

  if (category && category !== "All") {
    all = all.filter((m) => m.category.toLowerCase() === String(category).toLowerCase());
  }

  if (status) {
    all = all.filter((m) => m.status === status);
  }

  if (search) {
    const q = String(search).toLowerCase();
    all = all.filter((m) => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }

  return res.json({
    success: true,
    total: all.length,
    markets: all,
  });
});

// 2. GET /api/markets/:id
router.get("/markets/:id", (req: Request, res: Response) => {
  const market = marketsMap.get(req.params.id);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  // Get recent trades / positions for this market
  const marketPositions = positionsList
    .filter((p) => p.marketId === market.id)
    .slice(0, 20);

  return res.json({
    success: true,
    market,
    recentOrders: marketPositions,
  });
});

// 3. POST /api/markets
router.post("/markets", (req: Request, res: Response) => {
  const { title, description, category, initialLiquidity, creator, endsAt } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Market title is required" });
  }

  const id = `mkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newMarket: Market = {
    id,
    title: title.trim(),
    description: description || "Decentralized prediction event contract settled via Sidebet onchain oracle.",
    category: category || "Politics",
    yesShares: 5000,
    noShares: 5000,
    liquidity: Number(initialLiquidity) || 10,
    volume: 0,
    endsAt: endsAt || "7d",
    status: "open",
    resolution: null,
    creator: creator || "Community User",
    icon: category === "Crypto" ? "btc" : category === "Sports" ? "arsenal" : "obi",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  marketsMap.set(id, newMarket);
  persistMarkets();

  return res.status(201).json({
    success: true,
    market: newMarket,
  });
});

// 4. POST /api/markets/:id/resolve (Admin or Authorized Resolver)
router.post("/markets/:id/resolve", (req: Request, res: Response) => {
  const { resolution } = req.body; // "YES" | "NO"
  const market = marketsMap.get(req.params.id);

  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  if (market.status === "resolved") {
    return res.status(400).json({ error: "Market is already resolved" });
  }

  if (resolution !== "YES" && resolution !== "NO") {
    return res.status(400).json({ error: "Resolution must be 'YES' or 'NO'" });
  }

  // Resolve Market
  market.status = "resolved";
  market.resolution = resolution;
  market.resolvedAt = new Date().toISOString();
  persistMarkets();

  // Settle all related user positions
  let updatedCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  positionsList.forEach((pos) => {
    if (pos.marketId === market.id && pos.status === "open") {
      updatedCount++;
      if (pos.side === resolution) {
        pos.status = "won";
        pos.payout = pos.amount * pos.odds;
        wonCount++;
      } else {
        pos.status = "lost";
        pos.payout = 0;
        lostCount++;
      }
    }
  });

  persistPositions();

  return res.json({
    success: true,
    message: `Market resolved to ${resolution}. ${updatedCount} positions settled.`,
    market,
    stats: {
      settledPositions: updatedCount,
      wonPositions: wonCount,
      lostPositions: lostCount,
    },
  });
});

/* ==========================================================================
   POSITION & STAKING ROUTES
   ========================================================================== */

// 5. GET /api/positions
router.get("/positions", (req: Request, res: Response) => {
  const { userId, walletAddress, marketId } = req.query;
  let list = [...positionsList];

  if (walletAddress) {
    const addr = String(walletAddress).toLowerCase();
    list = list.filter((p) => p.walletAddress?.toLowerCase() === addr);
  } else if (userId) {
    list = list.filter((p) => p.userId === String(userId));
  }

  if (marketId) {
    list = list.filter((p) => p.marketId === String(marketId));
  }

  return res.json({
    success: true,
    total: list.length,
    positions: list,
  });
});

// 6. POST /api/positions (Stake on a market)
router.post("/positions", (req: Request, res: Response) => {
  const { marketId, side, amount, odds, userId, walletAddress, txSig } = req.body;

  if (!marketId || !side || !amount) {
    return res.status(400).json({ error: "marketId, side, and amount are required" });
  }

  const market = marketsMap.get(marketId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  if (market.status !== "open") {
    return res.status(400).json({ error: "Cannot stake on a resolved market" });
  }

  const stakeAmount = Number(amount);
  if (isNaN(stakeAmount) || stakeAmount <= 0) {
    return res.status(400).json({ error: "Invalid stake amount" });
  }

  // Update market AMM shares & volume
  const shareDelta = stakeAmount * 1000;
  if (side === "YES") {
    market.yesShares += shareDelta;
  } else {
    market.noShares += shareDelta;
  }
  market.volume += stakeAmount;
  market.liquidity += stakeAmount * 0.5;
  persistMarkets();

  // Create new position
  const position: Position = {
    id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: userId || "guest-user",
    walletAddress: walletAddress || undefined,
    marketId: market.id,
    title: market.title,
    side: side === "YES" ? "YES" : "NO",
    amount: stakeAmount,
    odds: Number(odds) || 1.85,
    status: "open",
    payout: 0,
    txSig: txSig || undefined,
    placedAt: new Date().toISOString(),
  };

  positionsList.unshift(position);
  persistPositions();

  return res.status(201).json({
    success: true,
    position,
    market,
  });
});

// 7. POST /api/positions/:id/claim
router.post("/positions/:id/claim", (req: Request, res: Response) => {
  const pos = positionsList.find((p) => p.id === req.params.id);
  if (!pos) {
    return res.status(404).json({ error: "Position not found" });
  }

  if (pos.status !== "won") {
    return res.status(400).json({ error: "Position is not in a winning state" });
  }

  pos.status = "claimed";
  persistPositions();

  return res.json({
    success: true,
    claimedAmount: pos.payout,
    position: pos,
  });
});

// 8. GET /api/stats/overview
router.get("/stats/overview", (_req: Request, res: Response) => {
  const allMarkets = Array.from(marketsMap.values());
  const totalVolume = allMarkets.reduce((acc, m) => acc + (m.volume || 0), 0);
  const totalLiquidity = allMarkets.reduce((acc, m) => acc + (m.liquidity || 0), 0);
  const openCount = allMarkets.filter((m) => m.status === "open").length;
  const resolvedCount = allMarkets.filter((m) => m.status === "resolved").length;

  return res.json({
    success: true,
    stats: {
      totalMarkets: allMarkets.length,
      openMarkets: openCount,
      resolvedMarkets: resolvedCount,
      totalVolume,
      totalLiquidity,
      totalPositions: positionsList.length,
      activeTradersCount: 1248,
    },
  });
});

export default router;
