import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();

router.post("/games/dice", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);

    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }

    const wager = Number(req.body?.wager);
    const prediction = req.body?.prediction;

    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    if (prediction !== "low" && prediction !== "high") {
      return res.status(400).json({ error: "Prediction must be low or high" });
    }

    const roll = randomInt(1, 7);
    const won = prediction === "low" ? roll <= 3 : roll >= 4;
    const delta = won ? wager : -wager;

    const { db, usersTable } = await import("@workspace/db");

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .limit(1);

    const user = existing[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await db
      .update(usersTable)
      .set({
        demoCredits: sql`${usersTable.demoCredits} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(usersTable.id, user.id),
          gte(usersTable.demoCredits, wager),
        ),
      )
      .returning();

    if (!updated[0]) {
      return res.status(400).json({ error: "Not enough demo credits" });
    }

    return res.json({
      roll,
      prediction,
      wager,
      won,
      payout: delta,
      demoCredits: updated[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return res.status(503).json({ error: error.message });
    }
    if (error instanceof AuthError) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: "Dice play failed" });
  }
});

export default router;
