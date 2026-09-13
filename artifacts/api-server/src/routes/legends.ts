import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const POSITIONS = ["ST", "CF", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK"];
const GRANT = 1000;
const FIRST_CAP = 333;
const ROLLOVER_X = 3;

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

export function toLegend(row: {
  name: string; position: string; pace: number; shooting: number; passing: number;
  dribbling: number; defending: number; physical: number; profileComplete: boolean;
}) {
  return {
    name: row.name,
    position: row.position,
    pace: row.pace,
    shooting: row.shooting,
    passing: row.passing,
    dribbling: row.dribbling,
    defending: row.defending,
    physical: row.physical,
    profileComplete: row.profileComplete,
    allocatedKchip: allocated(row),
  };
}

router.get("/legends/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const { db, legendsTable } = await import("@workspace/db");
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    return res.json(rows[0] ? toLegend(rows[0]) : null);
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Legend read failed" });
  }
});

router.put("/legends/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
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
        demoCredits: GRANT,
      });
      playable = GRANT;
    } else if (playable <= 0 && !existing[0]?.profileComplete) {
      await db.update(usersTable).set({ demoCredits: GRANT, updatedAt: new Date() }).where(eq(usersTable.privyUserId, identity.privyUserId));
      playable = GRANT;
    }
    const bank = playable + oldAlloc;
    const volumeRows = await db.select({
      volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
    }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, identity.privyUserId));
    const wagered = Number(volumeRows[0]?.volume ?? 0);
    const rolloverNeed = (GRANT - FIRST_CAP) * ROLLOVER_X;
    const unlocked = wagered >= rolloverNeed;
    const cap = unlocked ? bank : Math.min(bank, FIRST_CAP);
    if (needed > cap) {
      const left = Math.max(0, rolloverNeed - wagered);
      return res.status(400).json({
        error: unlocked
          ? `Need ${needed} KTK. Bank is ${bank}.`
          : `First card can lock ${FIRST_CAP} KTK (33% of 1000). Wager ${left} more KTK (3x rollover) to reallocate the rest.`,
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
