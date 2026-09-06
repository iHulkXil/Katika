import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();

async function adjust(req: Parameters<IRouter["post"]>[1] extends infer _ ? never : never, delta: number) {
  return delta;
}

router.post("/kchip/deposit", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const amount = Number((req.body as { amount?: number })?.amount ?? 0);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }
    const { db, usersTable } = await import("@workspace/db");
    const rows = await db
      .update(usersTable)
      .set({
        demoCredits: sql`${usersTable.demoCredits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .returning();
    if (!rows[0]) return res.status(404).json({ error: "Sign in first" });
    return res.json({
      demoCredits: rows[0].demoCredits,
      kchip: rows[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Deposit credit failed" });
  }
});

router.post("/kchip/withdraw", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const amount = Number((req.body as { amount?: number })?.amount ?? 0);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }
    const { db, usersTable } = await import("@workspace/db");
    const current = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .limit(1);
    if (!current[0] || current[0].demoCredits < amount) {
      return res.status(400).json({ error: "Not enough KCHIP on the table" });
    }
    const rows = await db
      .update(usersTable)
      .set({
        demoCredits: sql`${usersTable.demoCredits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .returning();
    return res.json({
      demoCredits: rows[0].demoCredits,
      kchip: rows[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Withdraw debit failed" });
  }
});

export default router;
