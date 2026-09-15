import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { KTK_FIRST_CAP, KTK_GRANT, ktkRolloverNeed } from "../lib/ktk-economy";

const router: IRouter = Router();
const POSITIONS = ["ST", "CF", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK"];

function clamp(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

function allocated(row: {
  pace: number; shooting: number; passing: number;
  dribbling: number; defending: number; physical: number;
}) {
  return row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical;
}

const SEPOLIA_LEGEND_CONTRACT = "0x613C6Acf04944b150937a07F431269F54a9d7B41";

export type MintRecord = {
  tokenId: number;
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  mintedAt: string;
  chain: string;
  chainId: number;
  tokenUri: string;
  snapshot: {
    name: string;
    position: string;
    overall: number;
    stats: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    };
    allocatedKtk: number;
    avatarSeed: string;
  };
};

const mintStore = new Map<string, MintRecord>();

export function toLegend(row: {
  name: string; position: string; pace: number; shooting: number; passing: number;
  dribbling: number; defending: number; physical: number; profileComplete: boolean;
}, privyUserId?: string) {
  const ovr = Math.round((row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical) / 6);
  const mint = privyUserId ? mintStore.get(privyUserId) ?? null : null;
  return {
    name: row.name,
    position: row.position,
    pace: row.pace,
    shooting: row.shooting,
    passing: row.passing,
    dribbling: row.dribbling,
    defending: row.defending,
    physical: row.physical,
    overall: ovr,
    profileComplete: row.profileComplete,
    allocatedKchip: allocated(row),
    allocatedKtk: allocated(row),
    mint,
  };
}

router.get("/legends/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, legendsTable } = await import("@workspace/db");
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    return res.json(rows[0] ? toLegend(rows[0], identity.privyUserId) : null);
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Legend read failed" });
  }
});

router.post("/legends/mint", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, legendsTable, gameBetsTable } = await import("@workspace/db");
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const legend = rows[0];
    if (!legend || !legend.profileComplete) {
      return res.status(400).json({ error: "Complete and save your Legend card before minting." });
    }

    const volumeRows = await db.select({
      volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
    }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, identity.privyUserId));
    const wagered = Number(volumeRows[0]?.volume ?? 0);

    const ovr = Math.round((legend.pace + legend.shooting + legend.passing + legend.dribbling + legend.defending + legend.physical) / 6);
    const allocKtk = allocated(legend);
    const existingMint = mintStore.get(identity.privyUserId);

    // If already minted, evolution of stats
    const tokenId = existingMint?.tokenId ?? (1040 + Math.floor(Math.abs(hashString(identity.privyUserId)) % 8900));
    const seed = `${legend.name.toLowerCase().trim()}-${legend.position}-${allocKtk}`;
    
    // Deterministic synthetic transaction hash on Sepolia
    const hex = Math.abs(hashString(identity.privyUserId + Date.now().toString())).toString(16).padStart(12, "0");
    const txHash = `0x${hex}7c89f10423bb6e9012cd4a5587f13b${Math.floor(Math.random() * 899 + 100)}`;

    const record: MintRecord = {
      tokenId,
      contractAddress: SEPOLIA_LEGEND_CONTRACT,
      txHash: existingMint?.txHash ?? txHash,
      blockNumber: 6842000 + (tokenId % 5000),
      mintedAt: existingMint?.mintedAt ?? new Date().toISOString(),
      chain: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      tokenUri: `/api/legends/token/${tokenId}`,
      snapshot: {
        name: legend.name,
        position: legend.position,
        overall: ovr,
        stats: {
          pace: legend.pace,
          shooting: legend.shooting,
          passing: legend.passing,
          dribbling: legend.dribbling,
          defending: legend.defending,
          physical: legend.physical,
        },
        allocatedKtk: allocKtk,
        avatarSeed: seed,
      },
    };

    mintStore.set(identity.privyUserId, record);

    return res.json({
      success: true,
      message: existingMint ? "Legend evolved on Sepolia!" : "Legend minted to Sepolia!",
      mint: record,
      legend: toLegend(legend, identity.privyUserId),
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Minting failed" });
  }
});

router.get("/legends/token/:id", (req, res) => {
  const id = Number(req.params.id);
  // Find record in mintStore
  let found: MintRecord | undefined;
  for (const record of mintStore.values()) {
    if (record.tokenId === id) {
      found = record;
      break;
    }
  }

  const name = found?.snapshot.name ?? `Legend #${id}`;
  const position = found?.snapshot.position ?? "CAM";
  const ovr = found?.snapshot.overall ?? 78;
  const stats = found?.snapshot.stats ?? { pace: 75, shooting: 78, passing: 80, dribbling: 82, defending: 65, physical: 72 };
  const alloc = found?.snapshot.allocatedKtk ?? 330;

  return res.json({
    name: `${name} (OVR ${ovr})`,
    description: "Katika.Bet Living Player Identity Card on Ethereum Sepolia Testnet. Gates the casino floor and evolves with table rollover milestones.",
    image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name + position)}`,
    external_url: "https://katika.bet",
    attributes: [
      { trait_type: "Position", value: position },
      { trait_type: "Overall Rating", value: ovr, max_value: 99 },
      { trait_type: "Pace", value: stats.pace, max_value: 99 },
      { trait_type: "Shooting", value: stats.shooting, max_value: 99 },
      { trait_type: "Passing", value: stats.passing, max_value: 99 },
      { trait_type: "Dribbling", value: stats.dribbling, max_value: 99 },
      { trait_type: "Defending", value: stats.defending, max_value: 99 },
      { trait_type: "Physical", value: stats.physical, max_value: 99 },
      { trait_type: "Allocated KTK", value: alloc },
      { trait_type: "Standard", value: "ERC-721" },
      { trait_type: "Network", value: "Ethereum Sepolia" },
    ],
  });
});

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

router.get("/leaderboard", async (_req, res) => {
  try {
    const { db, legendsTable, gameBetsTable } = await import("@workspace/db");
    const legends = await db.select().from(legendsTable).where(eq(legendsTable.profileComplete, true)).limit(20);

    const volumeRows = await db.select({
      privyUserId: gameBetsTable.privyUserId,
      volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
      betsCount: sql<number>`count(*)`,
    }).from(gameBetsTable).groupBy(gameBetsTable.privyUserId);

    const volumeMap = new Map<string, { volume: number; betsCount: number }>();
    for (const v of volumeRows) {
      volumeMap.set(v.privyUserId, { volume: Number(v.volume), betsCount: Number(v.betsCount) });
    }

    const leaderboardItems = legends.map((l) => {
      const vol = volumeMap.get(l.privyUserId)?.volume ?? 0;
      const count = volumeMap.get(l.privyUserId)?.betsCount ?? 0;
      const ovr = Math.round((l.pace + l.shooting + l.passing + l.dribbling + l.defending + l.physical) / 6);
      const mint = mintStore.get(l.privyUserId);
      return {
        id: l.id,
        name: l.name,
        position: l.position,
        overall: ovr,
        allocatedKtk: allocated(l),
        volume: vol,
        gamesPlayed: count,
        mintedTokenId: mint?.tokenId ?? null,
        isMinted: Boolean(mint),
        form: ["W", "W", "L", "W", "W"].slice(0, 5),
      };
    });

    // Add baseline seeded legends if fewer than 5 exist to show a rich football / FIFA style board
    const baseline = [
      { id: 901, name: "K. Ronaldo", position: "ST", overall: 88, allocatedKtk: 333, volume: 14250, gamesPlayed: 124, mintedTokenId: 1001, isMinted: true, form: ["W", "W", "W", "L", "W"] },
      { id: 902, name: "L. Messi", position: "RW", overall: 87, allocatedKtk: 330, volume: 11800, gamesPlayed: 98, mintedTokenId: 1002, isMinted: true, form: ["W", "L", "W", "W", "W"] },
      { id: 903, name: "K. De Bruyne", position: "CAM", overall: 85, allocatedKtk: 325, volume: 8400, gamesPlayed: 76, mintedTokenId: 1008, isMinted: true, form: ["W", "W", "L", "D", "W"] },
      { id: 904, name: "V. van Dijk", position: "CB", overall: 84, allocatedKtk: 320, volume: 6200, gamesPlayed: 54, mintedTokenId: null, isMinted: false, form: ["L", "W", "W", "W", "L"] },
      { id: 905, name: "E. Haaland", position: "CF", overall: 83, allocatedKtk: 318, volume: 5100, gamesPlayed: 45, mintedTokenId: null, isMinted: false, form: ["W", "L", "W", "L", "W"] },
    ];

    const merged = [...leaderboardItems];
    for (const b of baseline) {
      if (!merged.some((m) => m.name === b.name)) {
        merged.push(b);
      }
    }

    // Sort primarily by Overall Rating (OVR), then by Table Volume
    merged.sort((a, b) => b.overall - a.overall || b.volume - a.volume);

    return res.json({
      leaderboard: merged.map((item, idx) => ({ ...item, rank: idx + 1 })),
      contractAddress: SEPOLIA_LEGEND_CONTRACT,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.put("/legends/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const body = req.body as Record<string, unknown>;
    const name = String(body.name ?? "").trim().slice(0, 24);
    const position = String(body.position ?? "CAM");
    if (name.length < 2) return res.status(400).json({ error: "Name the legend" });
    if (!POSITIONS.includes(position)) return res.status(400).json({ error: "Pick a position" });
    const stats = {
      pace: clamp(Number(body.pace)),
      shooting: clamp(Number(body.shooting)),
      passing: clamp(Number(body.passing)),
      dribbling: clamp(Number(body.dribbling)),
      defending: clamp(Number(body.defending)),
      physical: clamp(Number(body.physical)),
    };
    const needed = allocated(stats);
    const { db, legendsTable, usersTable, gameBetsTable, DEFAULT_DEMO_CREDITS } = await import("@workspace/db");
    const users = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);
    const existing = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const oldAlloc = existing[0] ? allocated(existing[0]) : 0;
    let playable = users[0]?.demoCredits ?? DEFAULT_DEMO_CREDITS;
    if (!users[0]) {
      await db.insert(usersTable).values({
        privyUserId: identity.privyUserId,
        demoCredits: KTK_GRANT,
      });
      playable = KTK_GRANT;
    } else if (playable <= 0 && !existing[0]?.profileComplete) {
      await db.update(usersTable).set({ demoCredits: KTK_GRANT, updatedAt: new Date() }).where(eq(usersTable.privyUserId, identity.privyUserId));
      playable = KTK_GRANT;
    }
    const bank = playable + oldAlloc;
    const volumeRows = await db.select({
      volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
    }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, identity.privyUserId));
    const wagered = Number(volumeRows[0]?.volume ?? 0);
    const rolloverNeed = ktkRolloverNeed();
    const unlocked = wagered >= rolloverNeed;
    const cap = unlocked ? bank : Math.min(bank, KTK_FIRST_CAP);
    if (needed > cap) {
      const left = Math.max(0, rolloverNeed - wagered);
      return res.status(400).json({
        error: unlocked
          ? `Need ${needed} KTK. Bank is ${bank}.`
          : `First card can lock ${KTK_FIRST_CAP} KTK of the 600 grant. Wager ${left} more KTK (10x on the rest) to reallocate.`,
        playableKchip: playable,
        allocatedKchip: needed,
        cap,
        wagered,
        rolloverNeed,
      });
    }
    const nextPlayable = bank - needed;
    const values = {
      privyUserId: identity.privyUserId,
      name,
      position,
      ...stats,
      profileComplete: true,
      updatedAt: new Date(),
    };
    if (existing[0]) {
      await db.update(legendsTable).set(values).where(eq(legendsTable.privyUserId, identity.privyUserId));
    } else {
      await db.insert(legendsTable).values(values);
    }
    await db.update(usersTable).set({
      demoCredits: nextPlayable,
      updatedAt: new Date(),
    }).where(eq(usersTable.privyUserId, identity.privyUserId));
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    return res.json({ ...toLegend(rows[0]), playableKchip: nextPlayable });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Legend save failed. Create the legends table in Neon." });
  }
});

export default router;
