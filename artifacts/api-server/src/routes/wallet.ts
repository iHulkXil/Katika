import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function playable(onChain: number, allocated: number) {
  return Math.max(0, onChain - allocated);
}

async function allocatedFor(privyUserId: string) {
  try {
    const { db, legendsTable } = await import("@workspace/db");
    const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
    const row = rows[0];
    if (!row) return { allocated: 0, profileComplete: false };
    return {
      allocated: row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical,
      profileComplete: row.profileComplete,
    };
  } catch {
    return { allocated: 0, profileComplete: false };
  }
}

router.get("/wallet/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const card = await allocatedFor(identity.privyUserId);
    return res.json({
      walletAddress: null,
      onChainKchip: 0,
      allocatedKchip: card.allocated,
      playableKchip: playable(0, card.allocated),
      profileComplete: card.profileComplete,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Wallet read failed" });
  }
});

router.post("/wallet/link", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const address = String((req.body as { address?: string })?.address ?? "").trim();
    if (!ADDRESS.test(address)) {
      return res.status(400).json({ error: "Use a Sepolia wallet address." });
    }
    let onChain = 0;
    try {
      const { readKchipBalance } = await import("../lib/kchip");
      onChain = await readKchipBalance(address.toLowerCase());
    } catch {
      onChain = 0;
    }
    const card = await allocatedFor(identity.privyUserId);
    return res.json({
      walletAddress: address.toLowerCase(),
      onChainKchip: onChain,
      allocatedKchip: card.allocated,
      playableKchip: playable(onChain, card.allocated),
      profileComplete: card.profileComplete,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
      privyUserId: identity.privyUserId,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Wallet link failed" });
  }
});

export default router;
