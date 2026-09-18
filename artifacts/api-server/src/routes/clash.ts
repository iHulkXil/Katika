import { Router, type IRouter } from "express";
import { desc, eq, or } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { recordBet } from "../lib/record-bet";
import {
  creditBought,
  debitPlayable,
  getKtkEconomy,
  getOrCreateUser,
  maxWagerForPerk,
  useStaminaSlot,
  HOUSE_EDGE,
} from "../lib/ktk-economy";
import {
  calculateClashPot,
  getBotOpponent,
  simulateClash,
  type LegendCombatant,
} from "../lib/clash-engine";

const router: IRouter = Router();

router.get("/clash/stamina", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const economy = await getKtkEconomy(identity.privyUserId);
    return res.json({
      dailySlots: economy.dailySlots,
      slotsUsed: economy.slotsUsed,
      stamina: economy.stamina,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Failed to get stamina" });
  }
});

router.post("/clash/queue", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const stake = Number(req.body?.stake ?? 10);

    const { db, legendsTable, clashesTable, houseRakeTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);
    const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const card = cards[0];

    if (!card || !card.profileComplete) {
      return res.status(400).json({ error: "Create and allocate your Legend card before entering Clash arena." });
    }

    const maxWager = maxWagerForPerk(card.perkId);
    if (!Number.isInteger(stake) || stake < 5 || stake > maxWager) {
      return res.status(400).json({ error: `Stake must be between 5 and ${maxWager} KTK.` });
    }

    // Check & consume stamina slot
    const staminaCheck = await useStaminaSlot(identity.privyUserId);
    if (!staminaCheck.success) {
      return res.status(400).json({ error: staminaCheck.error });
    }

    // Debit stake from player
    const debit = await debitPlayable(user.id, identity.privyUserId, stake);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const p1Overall = Math.round((card.pace + card.shooting + card.passing + card.dribbling + card.defending + card.physical) / 6);
    const p1: LegendCombatant = {
      id: String(user.id),
      name: card.name,
      position: card.position,
      pace: card.pace,
      shooting: card.shooting,
      passing: card.passing,
      dribbling: card.dribbling,
      defending: card.defending,
      physical: card.physical,
      overall: p1Overall,
    };

    // Find bot or matched opponent
    const p2 = getBotOpponent(p1Overall);

    // Run combat simulation
    const simulation = simulateClash(p1, p2);
    const pot = calculateClashPot(stake);
    const p1Won = simulation.winnerId === "p1";
    const netPayout = p1Won ? pot.winnerPayout - stake : -stake;

    if (p1Won) {
      await creditBought(user.id, identity.privyUserId, pot.winnerPayout);
    }

    const clashId = `clash_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const rakeId = `rake_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Record house rake
    await db.insert(houseRakeTable).values({
      id: rakeId,
      clashId,
      amount: pot.houseRake,
    });

    // Record clash history
    const clashRecord = await db.insert(clashesTable).values({
      id: clashId,
      creatorId: identity.privyUserId,
      opponentId: "bot",
      stake,
      mode: "queue",
      state: "resolved",
      creatorLane: "mid",
      opponentLane: "mid",
      winnerId: p1Won ? identity.privyUserId : "bot",
      loserPays: stake,
      rake: pot.houseRake,
      prize: pot.winnerPayout,
      creatorStats: p1 as any,
      opponentStats: p2 as any,
      resolvedAt: new Date(),
    }).returning();

    // Record bet for rollover volume tracking
    await recordBet({
      userId: user.id,
      privyUserId: identity.privyUserId,
      game: "clash",
      wager: stake,
      payout: netPayout,
      won: p1Won,
      detail: {
        clashId,
        opponent: p2.name,
        p1Score: simulation.p1Score,
        p2Score: simulation.p2Score,
        houseEdge: HOUSE_EDGE,
      },
    });

    const economy = await getKtkEconomy(identity.privyUserId);

    return res.json({
      clashId,
      stake,
      pot: pot.totalPot,
      houseRake: pot.houseRake,
      winnerPayout: pot.winnerPayout,
      won: p1Won,
      netPayout,
      p1,
      p2,
      simulation,
      ...economy,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Clash matchmaking failed" });
  }
});

router.get("/clash/history", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, clashesTable } = await import("@workspace/db");
    const rows = await db.select().from(clashesTable).where(
      or(
        eq(clashesTable.creatorId, identity.privyUserId),
        eq(clashesTable.opponentId, identity.privyUserId),
      ),
    ).orderBy(desc(clashesTable.createdAt)).limit(20);

    const clashes = rows.map((r) => ({
      id: r.id,
      challengerCardName: (r.creatorStats as any)?.name ?? "Player",
      opponentCardName: (r.opponentStats as any)?.name ?? "Bot Opponent",
      stake: r.stake,
      pot: (r.prize ?? r.stake * 2) + (r.rake ?? 0),
      rake: r.rake ?? Math.round(r.stake * 2 * 0.06),
      winnerPrivyUserId: r.winnerId,
      createdAt: r.createdAt,
    }));

    return res.json({ clashes });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Failed to fetch clash history" });
  }
});

router.get("/clash/recent", async (_req, res) => {
  try {
    const { db, clashesTable } = await import("@workspace/db");
    const rows = await db.select().from(clashesTable)
      .where(eq(clashesTable.state, "resolved"))
      .orderBy(desc(clashesTable.createdAt))
      .limit(10);

    const clashes = rows.map((r) => ({
      id: r.id,
      challengerCardName: (r.creatorStats as any)?.name ?? "Player",
      opponentCardName: (r.opponentStats as any)?.name ?? "Bot Opponent",
      stake: r.stake,
      pot: (r.prize ?? r.stake * 2) + (r.rake ?? 0),
      rake: r.rake ?? Math.round(r.stake * 2 * 0.06),
      winnerPrivyUserId: r.winnerId,
      createdAt: r.createdAt,
    }));

    return res.json({ clashes });
  } catch {
    return res.json({ clashes: [] });
  }
});

export default router;
