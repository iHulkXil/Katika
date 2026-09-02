import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();

function toMeResponse(user: {
  id: number;
  privyUserId: string;
  demoCredits: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    privyUserId: user.privyUserId,
    demoCredits: user.demoCredits,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.get("/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);

    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        error: "Database is not configured",
      });
    }

    const { db, usersTable, DEFAULT_DEMO_CREDITS } = await import("@workspace/db");

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.privyUserId, identity.privyUserId))
      .limit(1);

    if (existing[0]) {
      return res.json(toMeResponse(existing[0]));
    }

    try {
      const inserted = await db
        .insert(usersTable)
        .values({
          privyUserId: identity.privyUserId,
          demoCredits: DEFAULT_DEMO_CREDITS,
        })
        .returning();

      if (inserted[0]) {
        return res.json(toMeResponse(inserted[0]));
      }
    } catch {
      const raced = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.privyUserId, identity.privyUserId))
        .limit(1);

      if (raced[0]) {
        return res.json(toMeResponse(raced[0]));
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
