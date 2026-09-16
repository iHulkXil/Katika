import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { getKtkEconomy, KTK_GRANT } from "../lib/ktk-economy";
import { mintFeeState } from "../lib/mint-fee";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, usersTable, legendsTable } = await import("@workspace/db");
    const existing = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);

    let user = existing[0];
    if (user && (user.demoCredits ?? 0) <= 0) {
      const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
      if (!cards[0]?.profileComplete) {
        const topped = await db.update(usersTable).set({ demoCredits: KTK_GRANT, updatedAt: new Date() }).where(eq(usersTable.privyUserId, identity.privyUserId)).returning();
        user = topped[0] ?? { ...user, demoCredits: KTK_GRANT };
      }
    }

    if (!user) {
      try {
        const inserted = await db.insert(usersTable).values({
          privyUserId: identity.privyUserId,
          demoCredits: KTK_GRANT,
        }).returning();
        user = inserted[0];
      } catch {
        const raced = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);
        user = raced[0];
      }
    }

    if (!user) return res.status(500).json({ error: "Failed to persist user" });
    const extra = await getKtkEconomy(identity.privyUserId, user.demoCredits);
    return res.json({
      id: user.id,
      privyUserId: user.privyUserId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      ...extra,
      ...mintFeeState(),
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
