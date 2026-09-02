import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);

    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        error: "Database is not configured",
      });
    }

    const { db, usersTable } = await import("@workspace/db");

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .limit(1);

    if (existing[0]) {
      return res.json({
        id: existing[0].id,
        privyUserId: existing[0].privyUserId,
        createdAt: existing[0].createdAt,
        updatedAt: existing[0].updatedAt,
      });
    }

    try {
      const inserted = await db
        .insert(usersTable)
        .values({ privyUserId: identity.privyUserId })
        .returning();

      if (inserted[0]) {
        return res.json({
          id: inserted[0].id,
          privyUserId: inserted[0].privyUserId,
          createdAt: inserted[0].createdAt,
          updatedAt: inserted[0].updatedAt,
        });
      }
    } catch {
      const raced = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.privyUserId, identity.privyUserId))
        .limit(1);

      if (raced[0]) {
        return res.json({
          id: raced[0].id,
          privyUserId: raced[0].privyUserId,
          createdAt: raced[0].createdAt,
          updatedAt: raced[0].updatedAt,
        });
      }
      throw new Error("Failed to persist user");
    }

    return res.status(500).json({ error: "Failed to persist user" });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return res.status(503).json({ error: error.message });
    }
    if (error instanceof AuthError) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
