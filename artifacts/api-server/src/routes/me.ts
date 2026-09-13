import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const GRANT = 1000;
const FIRST_CAP = 333;
const ROLLOVER_X = 3;

async function economy(privyUserId: string, demoCredits: number) {
  const { db, legendsTable, gameBetsTable } = await import("@workspace/db");
  const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
  const card = cards[0];
  const allocated = card
    ? card.pace + card.shooting + card.passing + card.dribbling + card.defending + card.physical
    : 0;
  const volumeRows = await db.select({
    volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
  }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, privyUserId));
  const wagered = Number(volumeRows[0]?.volume ?? 0);
  const rolloverNeed = (GRANT - FIRST_CAP) * ROLLOVER_X;
  const rolloverLeft = Math.max(0, rolloverNeed - wagered);
  const unlocked = wagered >= rolloverNeed;
  return {
    demoCredits,
    ktk: demoCredits,
    allocated,
    wagered,
    rolloverNeed,
    rolloverLeft,
    unlocked,
    profileComplete: Boolean(card?.profileComplete),
    token: "KTK",
  };
}

function toMeResponse(
  user: { id: number; privyUserId: string; demoCredits: number; createdAt: Date; updatedAt: Date },
  extra: Awaited<ReturnType<typeof economy>>,
) {
  return {
    id: user.id,
    privyUserId: user.privyUserId,
    demoCredits: user.demoCredits,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...extra,
  };
}

router.get("/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }
    const { db, usersTable, legendsTable } = await import("@workspace/db");
    const existing = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);

    let user = existing[0];
    if (user && (user.demoCredits ?? 0) <= 0) {
      const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
      if (!cards[0]?.profileComplete) {
        const topped = await db.update(usersTable).set({ demoCredits: GRANT, updatedAt: new Date() }).where(eq(usersTable.privyUserId, identity.privyUserId)).returning();
        user = topped[0] ?? { ...user, demoCredits: GRANT };
      }
    }

    if (!user) {
      try {
        const inserted = await db.insert(usersTable).values({
          privyUserId: identity.privyUserId,
          demoCredits: GRANT,
        }).returning();
        user = inserted[0];
      } catch {
        const raced = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);
        user = raced[0];
      }
    }

    if (!user) return res.status(500).json({ error: "Failed to persist user" });
    const extra = await economy(identity.privyUserId, user.demoCredits);
    return res.json(toMeResponse(user, extra));
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
