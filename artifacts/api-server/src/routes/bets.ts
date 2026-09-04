import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();

router.get("/bets", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }
    const { db, gameBetsTable } = await import("@workspace/db");
    const rows = await db
      .select()
      .from(gameBetsTable)
      .where(eq(gameBetsTable.privyUserId, identity.privyUserId))
      .orderBy(desc(gameBetsTable.createdAt))
      .limit(40);
    return res.json({
      bets: rows.map((row) => ({
        id: row.id,
        game: row.game,
        wager: row.wager,
        payout: row.payout,
        won: row.won,
        detail: row.detail,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Could not load bets" });
  }
});

export default router;
