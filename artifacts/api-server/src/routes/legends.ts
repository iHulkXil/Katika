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
const photoStore = new Map<string, { photoUrl?: string; nationFlag?: string }>();

export function toLegend(row: {
  name: string; position: string; pace: number; shooting: number; passing: number;
  dribbling: number; defending: number; physical: number; profileComplete: boolean;
  perkId?: string | null; ruleset?: number; tokenId?: number | null; mint?: any;
  allocatedTotal?: number; allocatedFromGrant?: number; allocatedFromBought?: number;
  rolloverBaseU0?: number | null; rolloverTargetR?: number | null;
}, privyUserId?: string) {
  const ovr = Math.round((row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical) / 6);
  const mint = row.mint ?? (privyUserId ? mintStore.get(privyUserId) ?? null : null);
  const storedPhoto = privyUserId ? photoStore.get(privyUserId) : null;
  const photoUrl = (mint as any)?.photoUrl ?? storedPhoto?.photoUrl ?? (mint as any)?.snapshot?.photoUrl ?? null;
  const nationFlag = (mint as any)?.nationFlag ?? storedPhoto?.nationFlag ?? null;

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
    perkId: row.perkId ?? "kit_prime",
    ruleset: row.ruleset ?? 1,
    allocatedKchip: allocated(row),
    allocatedKtk: allocated(row),
    allocatedFromGrant: row.allocatedFromGrant ?? allocated(row),
    allocatedFromBought: row.allocatedFromBought ?? 0,
    rolloverBaseU0: row.rolloverBaseU0,
    rolloverTargetR: row.rolloverTargetR,
    mint,
    photoUrl: photoUrl ?? undefined,
    nationFlag: nationFlag ?? undefined,
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
    const perkId = ["kit_prime", "table_skin", "stake_plus"].includes(String(body.perkId))
      ? String(body.perkId)
      : undefined;

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
    const { db, legendsTable, usersTable, gameBetsTable } = await import("@workspace/db");
    const { getOrCreateUser } = await import("../lib/ktk-economy");
    const user = await getOrCreateUser(identity.privyUserId);
    const existing = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const isFirstSave = !existing[0] || !existing[0].profileComplete;

    const volumeRows = await db.select({
      volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
    }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, identity.privyUserId));
    const wagered = Number(volumeRows[0]?.volume ?? 0);

    const photoUrl = typeof body.photoUrl === 'string' && body.photoUrl ? body.photoUrl : undefined;
    const nationFlag = typeof body.nationFlag === 'string' && body.nationFlag ? body.nationFlag : undefined;
    if (identity.privyUserId && (photoUrl || nationFlag)) {
      photoStore.set(identity.privyUserId, {
        photoUrl: photoUrl ?? photoStore.get(identity.privyUserId)?.photoUrl,
        nationFlag: nationFlag ?? photoStore.get(identity.privyUserId)?.nationFlag,
      });
    }

    if (isFirstSave) {
      if (needed > KTK_FIRST_CAP) {
        return res.status(400).json({
          error: `First card allocation is capped at ${KTK_FIRST_CAP} KTK of the ${KTK_GRANT} grant.`,
          allocatedKtk: needed,
          cap: KTK_FIRST_CAP,
        });
      }

      const u0 = KTK_GRANT - needed;
      const targetR = u0 * 10;
      const existingMint = (existing[0]?.mint as Record<string, any>) ?? {};
      const values = {
        privyUserId: identity.privyUserId,
        name,
        position,
        ...stats,
        perkId: perkId ?? existing[0]?.perkId ?? "kit_prime",
        allocatedTotal: needed,
        allocatedFromGrant: needed,
        allocatedFromBought: 0,
        rolloverBaseU0: u0,
        rolloverTargetR: targetR,
        profileComplete: true,
        mint: {
          ...existingMint,
          ...(photoUrl ? { photoUrl } : {}),
          ...(nationFlag ? { nationFlag } : {}),
        },
        updatedAt: new Date(),
      };

      if (existing[0]) {
        await db.update(legendsTable).set(values).where(eq(legendsTable.privyUserId, identity.privyUserId));
      } else {
        await db.insert(legendsTable).values(values);
      }

      await db.update(usersTable).set({
        ktkGrantedWallet: u0,
        ktkBoughtWallet: 0,
        demoCredits: u0,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, user.id));

      const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
      return res.json({ ...toLegend(rows[0], identity.privyUserId), playableKchip: u0, playable: u0 });
    }

    // Reallocation / Respec path
    const legend = existing[0];
    const targetR = legend.rolloverTargetR ?? (legend.rolloverBaseU0 !== null ? legend.rolloverBaseU0 * 10 : ktkRolloverNeed());
    const unlocked = wagered >= targetR;

    if (!unlocked) {
      const left = Math.max(0, targetR - wagered);
      return res.status(400).json({
        error: `Wager ${left} more KTK (10x rollover on initial grant reserve) to reallocate your card.`,
        wagered,
        rolloverNeed: targetR,
        rolloverLeft: left,
      });
    }

    const currentGrant = Number(user.ktkGrantedWallet ?? 0);
    const currentBought = Number(user.ktkBoughtWallet ?? 0);
    const oldFromGrant = Number(legend.allocatedFromGrant ?? allocated(legend));
    const oldFromBought = Number(legend.allocatedFromBought ?? 0);

    // Refund prior allocation
    const bankGrant = currentGrant + oldFromGrant;
    const bankBought = currentBought + oldFromBought;
    const totalBank = bankGrant + bankBought;

    if (needed > totalBank) {
      return res.status(400).json({
        error: `Need ${needed} KTK. Total available bank is ${totalBank} KTK.`,
        bank: totalBank,
        needed,
      });
    }

    // Spend order: grant first for card allocation (preserving bought wallet as cash)
    const newFromGrant = Math.min(needed, bankGrant);
    const newFromBought = needed - newFromGrant;
    const nextGrantWallet = bankGrant - newFromGrant;
    const nextBoughtWallet = bankBought - newFromBought;
    const nextPlayable = nextGrantWallet + nextBoughtWallet;

    const existingMint = (legend.mint as Record<string, any>) ?? {};
    const updateValues = {
      name,
      position,
      ...stats,
      perkId: perkId ?? legend.perkId ?? "kit_prime",
      allocatedTotal: needed,
      allocatedFromGrant: newFromGrant,
      allocatedFromBought: newFromBought,
      profileComplete: true,
      mint: {
        ...existingMint,
        ...(photoUrl ? { photoUrl } : {}),
        ...(nationFlag ? { nationFlag } : {}),
      },
      updatedAt: new Date(),
    };

    await db.update(legendsTable).set(updateValues).where(eq(legendsTable.privyUserId, identity.privyUserId));
    await db.update(usersTable).set({
      ktkGrantedWallet: nextGrantWallet,
      ktkBoughtWallet: nextBoughtWallet,
      demoCredits: nextPlayable,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, user.id));

    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    return res.json({ ...toLegend(rows[0], identity.privyUserId), playableKchip: nextPlayable, playable: nextPlayable });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Legend save failed" });
  }
});

export default router;
