import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const POSITIONS = ["ST", "CF", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK"];

function clamp(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

function allocated(row: {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}) {
  return row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical;
}

export function toLegend(row: {
  name: string;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  profileComplete: boolean;
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
    const { db, legendsTable } = await import("@workspace/db");
    const values = {
      privyUserId: identity.privyUserId,
      name,
      position,
      ...stats,
      profileComplete: true,
      updatedAt: new Date(),
    };
    const existing = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    if (existing[0]) {
      await db.update(legendsTable).set(values).where(eq(legendsTable.privyUserId, identity.privyUserId));
    } else {
      await db.insert(legendsTable).values(values);
    }
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    return res.json(toLegend(rows[0]));
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Legend save failed. Create the legends table in Neon." });
  }
});

export default router;
