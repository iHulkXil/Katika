import { Router, type IRouter } from "express";
import { desc, eq, or, and } from "drizzle-orm";
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
  refundDebited,
  useStaminaSlot,
  HOUSE_EDGE,
} from "../lib/ktk-economy";
import {
  applyDrop,
  calculateClubPayout,
  checkWin,
  createInitialFourBoard,
  isFull,
  legalCols,
  type FourBoardState,
} from "../lib/four-engine";
import {
  applyMove as applyLudoMove,
  applyRoll as applyLudoRoll,
  createInitialLudoBoard,
  distanceToHome,
  getLegalTokens,
  type LudoBoardState,
  type LudoColor,
} from "../lib/ludo-engine";
import {
  deal21Match,
  apply21Action,
  check21Timeouts,
  resolve21,
  sanitize21BoardForClient,
  type TwentyOneBoard,
  type LegendStats,
} from "../lib/twentyone-engine";

const router: IRouter = Router();

const FOUR_TIMEOUT_MS = 15 * 1000;
const LUDO_TIMEOUT_MS = 20 * 1000;

async function getLegendProfile(privyUserId: string) {
  const { db, legendsTable } = await import("@workspace/db");
  const cards = await db
    .select()
    .from(legendsTable)
    .where(eq(legendsTable.privyUserId, privyUserId))
    .limit(1);
  return cards[0] ?? null;
}

function extractLegendStats(card: any): LegendStats {
  return {
    pac: Number(card?.pac ?? 50),
    sho: Number(card?.sho ?? 50),
    pas: Number(card?.pas ?? 50),
    dri: Number(card?.dri ?? 50),
    def: Number(card?.def ?? 50),
    phy: Number(card?.phy ?? 50),
  };
}

/**
 * Checks and executes auto-move if clock expired for any live game
 */
async function applyTimeoutIfExpired(match: any): Promise<any> {
  if (match.state !== "live") return match;

  const { db, clubMatchesTable, houseRakeTable } = await import("@workspace/db");

  // 1. KATIKA 21 TIMEOUT CHECK
  if (match.game === "21") {
    const board = match.board as TwentyOneBoard;
    const changed = check21Timeouts(board);
    if (!changed) return match;

    if (board.phase === "resolved") {
      const creatorUser = await getOrCreateUser(match.creatorId);
      const opponentUser = await getOrCreateUser(match.opponentId!);

      if (board.winnerId) {
        const winnerId = board.winnerId;
        const loserId = winnerId === match.creatorId ? match.opponentId! : match.creatorId;
        const winnerUser = winnerId === match.creatorId ? creatorUser : opponentUser;
        const loserUser = loserId === match.creatorId ? creatorUser : opponentUser;
        const payout = board.payout!;

        await creditBought(winnerUser.id, winnerId, payout.prize);
        if (payout.loserRefund > 0) {
          await creditBought(loserUser.id, loserId, payout.loserRefund);
        }

        if (payout.rake > 0) {
          await db.insert(houseRakeTable).values({
            id: `rake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            clubId: match.id,
            amount: payout.rake,
          });
        }

        await recordBet({
          userId: winnerUser.id,
          privyUserId: winnerId,
          game: "pvp_21",
          wager: match.stake,
          payout: payout.prize - match.stake,
          won: true,
          detail: { pvpId: match.id, winnerId, summary: board.resolutionSummary },
        });
        await recordBet({
          userId: loserUser.id,
          privyUserId: loserId,
          game: "pvp_21",
          wager: match.stake,
          payout: -payout.loserPays,
          won: false,
          detail: { pvpId: match.id, winnerId, summary: board.resolutionSummary },
        });
      } else {
        // Push: refund both
        await creditBought(creatorUser.id, match.creatorId, match.stake);
        await creditBought(opponentUser.id, match.opponentId!, match.stake);

        await recordBet({
          userId: creatorUser.id,
          privyUserId: match.creatorId,
          game: "pvp_21",
          wager: match.stake,
          payout: 0,
          won: false,
          detail: { pvpId: match.id, push: true },
        });
        await recordBet({
          userId: opponentUser.id,
          privyUserId: match.opponentId!,
          game: "pvp_21",
          wager: match.stake,
          payout: 0,
          won: false,
          detail: { pvpId: match.id, push: true },
        });
      }

      const updated = await db
        .update(clubMatchesTable)
        .set({
          state: "resolved",
          board,
          winnerId: board.winnerId ?? null,
          rake: board.payout?.rake ?? 0,
          prize: board.payout?.prize ?? 0,
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();

      return updated[0] ?? match;
    }

    // Still in act phase, but clock updated
    const updated = await db
      .update(clubMatchesTable)
      .set({ board })
      .where(eq(clubMatchesTable.id, match.id))
      .returning();
    return updated[0] ?? match;
  }

  // 2. CONNECT FOUR TIMEOUT CHECK
  const now = Date.now();
  const lastActionTime = match.resolvedAt
    ? new Date(match.resolvedAt).getTime()
    : new Date(match.createdAt).getTime();

  const timeoutMs = match.game === "four" ? FOUR_TIMEOUT_MS : LUDO_TIMEOUT_MS;
  const elapsed = now - lastActionTime;
  if (elapsed < timeoutMs) {
    return match;
  }

  if (match.game === "four") {
    const board = match.board as FourBoardState;
    const openCols = legalCols(board.cells);

    if (openCols.length === 0) {
      // Board full -> Draw
      const creatorUser = await getOrCreateUser(match.creatorId);
      const opponentUser = await getOrCreateUser(match.opponentId!);
      await creditBought(creatorUser.id, match.creatorId, match.stake);
      await creditBought(opponentUser.id, match.opponentId!, match.stake);

      const updated = await db
        .update(clubMatchesTable)
        .set({
          state: "resolved",
          rake: 0,
          prize: 0,
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();
      return updated[0] ?? match;
    }

    // Auto-drop leftmost open column
    const colToDrop = openCols[0];
    const isCreatorTurn = match.turnUserId === match.creatorId;
    const dropColor = isCreatorTurn ? 1 : 2;

    const dropRes = applyDrop(board.cells, colToDrop, dropColor);
    if (!dropRes) return match;

    const nextMoves = [...(board.moves || []), colToDrop];
    const winResult = checkWin(dropRes.cells);

    if (winResult.winner !== 0) {
      const winnerId = winResult.winner === 1 ? match.creatorId : match.opponentId;
      const loserId = winResult.winner === 1 ? match.opponentId : match.creatorId;
      const payout = calculateClubPayout(match.stake);

      const winnerUser = await getOrCreateUser(winnerId);
      const loserUser = await getOrCreateUser(loserId);
      await creditBought(winnerUser.id, winnerId, payout.prize);

      await db.insert(houseRakeTable).values({
        id: `rake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        clubId: match.id,
        amount: payout.rake,
      });

      const updated = await db
        .update(clubMatchesTable)
        .set({
          state: "resolved",
          winnerId,
          rake: payout.rake,
          prize: payout.prize,
          board: {
            cells: dropRes.cells,
            moves: nextMoves,
            winningCells: winResult.winningCells,
          },
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();
      return updated[0] ?? match;
    }

    const nextTurnUserId = isCreatorTurn ? match.opponentId : match.creatorId;
    const updated = await db
      .update(clubMatchesTable)
      .set({
        turnUserId: nextTurnUserId,
        board: { cells: dropRes.cells, moves: nextMoves },
        resolvedAt: new Date(),
      })
      .where(eq(clubMatchesTable.id, match.id))
      .returning();
    return updated[0] ?? match;
  }

  // 3. LUDO TIMEOUT CHECK
  if (match.game === "ludo") {
    const board = match.board as LudoBoardState;
    const isCreatorTurn = match.turnUserId === match.creatorId;
    const nextTurnUserId = isCreatorTurn ? match.opponentId : match.creatorId;

    if (board.phase === "await_roll") {
      const updated = await db
        .update(clubMatchesTable)
        .set({
          turnUserId: nextTurnUserId,
          board: {
            ...board,
            die: 0,
            extras: 0,
            phase: "await_roll",
            lastAction: "Turn skipped due to inactivity",
          },
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();
      return updated[0] ?? match;
    }

    if (board.phase === "await_move") {
      const tokenToMove = board.legal[0];
      if (tokenToMove !== undefined) {
        const color: LudoColor = isCreatorTurn ? "red" : "yellow";
        const moveRes = applyLudoMove(board, color, tokenToMove as 0 | 1);

        if (moveRes.winner !== null) {
          const winnerId = moveRes.winner === "red" ? match.creatorId : match.opponentId;
          const loserId = moveRes.winner === "red" ? match.opponentId : match.creatorId;
          const payout = calculateClubPayout(match.stake);

          const winnerUser = await getOrCreateUser(winnerId);
          await creditBought(winnerUser.id, winnerId, payout.prize);

          const updated = await db
            .update(clubMatchesTable)
            .set({
              state: "resolved",
              winnerId,
              rake: payout.rake,
              prize: payout.prize,
              board: moveRes.board,
              resolvedAt: new Date(),
            })
            .where(eq(clubMatchesTable.id, match.id))
            .returning();
          return updated[0] ?? match;
        }

        const nextTurn = moveRes.extraTurn ? match.turnUserId : nextTurnUserId;
        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurn,
            board: moveRes.board,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return updated[0] ?? match;
      }
    }
  }

  return match;
}

// Handlers for Match Creation (Queue or Challenge)
async function handleCreateMatch(req: any, res: any) {
  try {
    const identity = await authenticateRequest(req);
    const gameRaw = req.body?.game;
    const game = gameRaw === "21" ? "21" : gameRaw === "ludo" ? "ludo" : "four";
    const mode = req.body?.mode === "challenge" ? "challenge" : "queue";
    const stake = Number(req.body?.stake ?? 10);

    const card = await getLegendProfile(identity.privyUserId);
    if (!card || !card.profileComplete) {
      return res.status(400).json({ error: "Create and allocate your Legend card before entering PvP." });
    }

    const maxWager = maxWagerForPerk(card.perkId);
    if (!Number.isInteger(stake) || stake < 1 || stake > maxWager) {
      return res.status(400).json({ error: `Stake must be between 1 and ${maxWager} KTK.` });
    }

    const economy = await getKtkEconomy(identity.privyUserId);
    if (economy.stamina <= 0) {
      return res.status(400).json({ error: "No stamina left for today. Daily slots refresh at 00:00 UTC." });
    }

    const { db, clubMatchesTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);

    // Queue pairing
    if (mode === "queue") {
      const openMatches = await db
        .select()
        .from(clubMatchesTable)
        .where(
          and(
            eq(clubMatchesTable.game, game),
            eq(clubMatchesTable.mode, "queue"),
            eq(clubMatchesTable.state, "open"),
            eq(clubMatchesTable.stake, stake)
          )
        )
        .limit(5);

      const available = openMatches.find((m: any) => m.creatorId !== identity.privyUserId);

      if (available) {
        // Join this match!
        const debit = await debitPlayable(user.id, identity.privyUserId, stake);
        if (!debit.success) {
          return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
        }

        await useStaminaSlot(available.creatorId);
        await useStaminaSlot(identity.privyUserId);

        let initialBoard: any;
        if (game === "21") {
          const creatorCard = await getLegendProfile(available.creatorId);
          const creatorStats = extractLegendStats(creatorCard);
          const opponentStats = extractLegendStats(card);
          initialBoard = deal21Match(available.creatorId, identity.privyUserId, stake, creatorStats, opponentStats);
        } else if (game === "four") {
          initialBoard = createInitialFourBoard();
        } else {
          initialBoard = createInitialLudoBoard();
        }

        const updated = await db
          .update(clubMatchesTable)
          .set({
            opponentId: identity.privyUserId,
            state: "live",
            turnUserId: available.creatorId,
            board: initialBoard,
            lastSeenOpponent: new Date(),
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, available.id))
          .returning();

        const match = updated[0];
        return res.json({ match, joined: true });
      }
    }

    // Debit stake from creator
    const debit = await debitPlayable(user.id, identity.privyUserId, stake);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const matchId = `pvp_${game}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let initialBoard: any;
    if (game === "21") {
      initialBoard = { phase: "deal" };
    } else if (game === "four") {
      initialBoard = createInitialFourBoard();
    } else {
      initialBoard = createInitialLudoBoard();
    }

    const created = await db
      .insert(clubMatchesTable)
      .values({
        id: matchId,
        game,
        ruleset: game === "21" ? "katika_21_v1" : game === "four" ? "four_v1" : "ludo_quick_v1",
        creatorId: identity.privyUserId,
        opponentId: null,
        stake,
        mode,
        state: "open",
        turnUserId: identity.privyUserId,
        board: initialBoard,
        lastSeenCreator: new Date(),
      })
      .returning();

    return res.json({ match: created[0], created: true });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("handleCreateMatch error:", error);
    return res.status(500).json({ error: "Failed to create PvP match" });
  }
}

// Handlers for Match Accept
async function handleAcceptMatch(req: any, res: any) {
  try {
    const identity = await authenticateRequest(req);
    const { id } = req.params;

    const { db, clubMatchesTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    const match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.state !== "open") return res.status(400).json({ error: `Match is ${match.state}` });
    if (match.creatorId === identity.privyUserId) {
      return res.status(400).json({ error: "Cannot accept your own match" });
    }

    const card = await getLegendProfile(identity.privyUserId);
    if (!card || !card.profileComplete) {
      return res.status(400).json({ error: "Complete your Legend card before accepting." });
    }

    const economy = await getKtkEconomy(identity.privyUserId);
    if (economy.stamina <= 0) {
      return res.status(400).json({ error: "No stamina left for today." });
    }

    const user = await getOrCreateUser(identity.privyUserId);
    const debit = await debitPlayable(user.id, identity.privyUserId, match.stake);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    await useStaminaSlot(match.creatorId);
    await useStaminaSlot(identity.privyUserId);

    let initialBoard: any;
    if (match.game === "21") {
      const creatorCard = await getLegendProfile(match.creatorId);
      const creatorStats = extractLegendStats(creatorCard);
      const opponentStats = extractLegendStats(card);
      initialBoard = deal21Match(match.creatorId, identity.privyUserId, match.stake, creatorStats, opponentStats);
    } else if (match.game === "four") {
      initialBoard = createInitialFourBoard();
    } else {
      initialBoard = createInitialLudoBoard();
    }

    const updated = await db
      .update(clubMatchesTable)
      .set({
        opponentId: identity.privyUserId,
        state: "live",
        turnUserId: match.creatorId,
        board: initialBoard,
        lastSeenOpponent: new Date(),
        resolvedAt: new Date(),
      })
      .where(eq(clubMatchesTable.id, id))
      .returning();

    return res.json({ match: updated[0] });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("handleAcceptMatch error:", error);
    return res.status(500).json({ error: "Failed to accept match" });
  }
}

// Handlers for Match Action (hit, stand, double, split, glance, drop, roll, move)
async function handleMatchAction(req: any, res: any) {
  try {
    const identity = await authenticateRequest(req);
    const { id } = req.params;

    const { db, clubMatchesTable, houseRakeTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    let match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });

    match = await applyTimeoutIfExpired(match);
    if (match.state !== "live") {
      return res.status(400).json({ error: `Match is already ${match.state}`, match });
    }

    const isCreator = identity.privyUserId === match.creatorId;
    const isOpponent = identity.privyUserId === match.opponentId;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ error: "Not a participant in this match" });
    }

    // ============================================
    // 1. KATIKA 21 ACTION
    // ============================================
    if (match.game === "21") {
      const actionRaw = req.body?.action || req.body?.op;
      if (!actionRaw || !["hit", "stand", "double", "split", "glance"].includes(actionRaw)) {
        return res.status(400).json({ error: "Invalid 21 action. Expected hit, stand, double, split, or glance" });
      }

      const board = match.board as TwentyOneBoard;
      const user = await getOrCreateUser(identity.privyUserId);

      let actionRes: { board: TwentyOneBoard; extraStakeDebited?: number };
      try {
        actionRes = apply21Action(board, identity.privyUserId, actionRaw);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }

      // If action required additional stake (Double or Split)
      if (actionRes.extraStakeDebited && actionRes.extraStakeDebited > 0) {
        const extraDebit = await debitPlayable(user.id, identity.privyUserId, actionRes.extraStakeDebited);
        if (!extraDebit.success) {
          return res.status(400).json({ error: extraDebit.error ?? "Insufficient KTK to double/split" });
        }
      }

      const nextBoard = actionRes.board;

      if (nextBoard.phase === "resolved") {
        const creatorUser = await getOrCreateUser(match.creatorId);
        const opponentUser = await getOrCreateUser(match.opponentId!);

        if (nextBoard.winnerId) {
          const winnerId = nextBoard.winnerId;
          const loserId = winnerId === match.creatorId ? match.opponentId! : match.creatorId;
          const winnerUser = winnerId === match.creatorId ? creatorUser : opponentUser;
          const loserUser = loserId === match.creatorId ? creatorUser : opponentUser;
          const payout = nextBoard.payout!;

          await creditBought(winnerUser.id, winnerId, payout.prize);
          if (payout.loserRefund > 0) {
            await creditBought(loserUser.id, loserId, payout.loserRefund);
          }

          if (payout.rake > 0) {
            await db.insert(houseRakeTable).values({
              id: `rake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              clubId: match.id,
              amount: payout.rake,
            });
          }

          await recordBet({
            userId: winnerUser.id,
            privyUserId: winnerId,
            game: "pvp_21",
            wager: match.stake,
            payout: payout.prize - match.stake,
            won: true,
            detail: { pvpId: match.id, winnerId, summary: nextBoard.resolutionSummary },
          });
          await recordBet({
            userId: loserUser.id,
            privyUserId: loserId,
            game: "pvp_21",
            wager: match.stake,
            payout: -payout.loserPays,
            won: false,
            detail: { pvpId: match.id, winnerId, summary: nextBoard.resolutionSummary },
          });
        } else {
          // Push: refund both full stakes
          await creditBought(creatorUser.id, match.creatorId, match.stake);
          await creditBought(opponentUser.id, match.opponentId!, match.stake);

          await recordBet({
            userId: creatorUser.id,
            privyUserId: match.creatorId,
            game: "pvp_21",
            wager: match.stake,
            payout: 0,
            won: false,
            detail: { pvpId: match.id, push: true },
          });
          await recordBet({
            userId: opponentUser.id,
            privyUserId: match.opponentId!,
            game: "pvp_21",
            wager: match.stake,
            payout: 0,
            won: false,
            detail: { pvpId: match.id, push: true },
          });
        }

        const updated = await db
          .update(clubMatchesTable)
          .set({
            state: "resolved",
            board: nextBoard,
            winnerId: nextBoard.winnerId ?? null,
            rake: nextBoard.payout?.rake ?? 0,
            prize: nextBoard.payout?.prize ?? 0,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();

        return res.json({
          match: updated[0],
          board: sanitize21BoardForClient(nextBoard, identity.privyUserId),
        });
      }

      // Still in active play
      const updated = await db
        .update(clubMatchesTable)
        .set({
          board: nextBoard,
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();

      return res.json({
        match: updated[0],
        board: sanitize21BoardForClient(nextBoard, identity.privyUserId),
      });
    }

    // ============================================
    // 2. CONNECT FOUR ACTION
    // ============================================
    if (match.game === "four") {
      if (match.turnUserId !== identity.privyUserId) {
        return res.status(400).json({ error: "Not your turn", match });
      }

      const col = Number(req.body?.col);
      if (!Number.isInteger(col) || col < 0 || col >= 7) {
        return res.status(400).json({ error: "Invalid column (0-6)" });
      }

      const board = match.board as FourBoardState;
      const dropColor = isCreator ? 1 : 2;

      const dropRes = applyDrop(board.cells, col, dropColor);
      if (!dropRes) {
        return res.status(400).json({ error: "Column is full" });
      }

      const nextMoves = [...(board.moves || []), col];
      const winResult = checkWin(dropRes.cells);

      if (winResult.winner !== 0) {
        const winnerId = winResult.winner === 1 ? match.creatorId : match.opponentId;
        const loserId = winResult.winner === 1 ? match.opponentId : match.creatorId;
        const payout = calculateClubPayout(match.stake);

        const winnerUser = await getOrCreateUser(winnerId);
        const loserUser = await getOrCreateUser(loserId);
        await creditBought(winnerUser.id, winnerId, payout.prize);

        await db.insert(houseRakeTable).values({
          id: `rake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          clubId: match.id,
          amount: payout.rake,
        });

        await recordBet({
          userId: winnerUser.id,
          privyUserId: winnerId,
          game: "pvp_four",
          wager: match.stake,
          payout: payout.prize - match.stake,
          won: true,
          detail: { pvpId: match.id, winnerId },
        });
        await recordBet({
          userId: loserUser.id,
          privyUserId: loserId,
          game: "pvp_four",
          wager: match.stake,
          payout: -match.stake,
          won: false,
          detail: { pvpId: match.id, winnerId },
        });

        const updated = await db
          .update(clubMatchesTable)
          .set({
            state: "resolved",
            winnerId,
            rake: payout.rake,
            prize: payout.prize,
            board: {
              cells: dropRes.cells,
              moves: nextMoves,
              winningCells: winResult.winningCells,
            },
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();

        return res.json({ match: updated[0] });
      }

      const nextTurnUserId = isCreator ? match.opponentId : match.creatorId;
      const updated = await db
        .update(clubMatchesTable)
        .set({
          turnUserId: nextTurnUserId,
          board: { cells: dropRes.cells, moves: nextMoves },
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();

      return res.json({ match: updated[0] });
    }

    // ============================================
    // 3. LUDO QUICK ACTION
    // ============================================
    if (match.game === "ludo") {
      if (match.turnUserId !== identity.privyUserId) {
        return res.status(400).json({ error: "Not your turn", match });
      }

      const board = match.board as LudoBoardState;
      const op = req.body?.op;
      const myColor: LudoColor = isCreator ? "red" : "yellow";
      const nextTurnUserId = isCreator ? match.opponentId : match.creatorId;

      if (op === "roll") {
        if (board.phase !== "await_roll") {
          return res.status(400).json({ error: "Not in roll phase" });
        }

        const rollRes = applyLudoRoll(board, myColor);
        const nextTurn = rollRes.hasLegalMoves ? match.turnUserId : nextTurnUserId;

        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurn,
            board: rollRes.board,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();

        return res.json({ match: updated[0] });
      }

      if (op === "move") {
        if (board.phase !== "await_move") {
          return res.status(400).json({ error: "Not in move phase. Roll first." });
        }

        const token = Number(req.body?.token);
        if (token !== 0 && token !== 1) {
          return res.status(400).json({ error: "Token must be 0 or 1" });
        }

        if (!board.legal.includes(token)) {
          return res.status(400).json({ error: "Illegal move for this token" });
        }

        const moveRes = applyLudoMove(board, myColor, token as 0 | 1);

        if (moveRes.winner !== null) {
          const winnerId = moveRes.winner === "red" ? match.creatorId : match.opponentId;
          const loserId = moveRes.winner === "red" ? match.opponentId : match.creatorId;
          const payout = calculateClubPayout(match.stake);

          const winnerUser = await getOrCreateUser(winnerId);
          const loserUser = await getOrCreateUser(loserId);
          await creditBought(winnerUser.id, winnerId, payout.prize);

          await db.insert(houseRakeTable).values({
            id: `rake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            clubId: match.id,
            amount: payout.rake,
          });

          await recordBet({
            userId: winnerUser.id,
            privyUserId: winnerId,
            game: "pvp_ludo",
            wager: match.stake,
            payout: payout.prize - match.stake,
            won: true,
            detail: { pvpId: match.id, winnerId },
          });
          await recordBet({
            userId: loserUser.id,
            privyUserId: loserId,
            game: "pvp_ludo",
            wager: match.stake,
            payout: -match.stake,
            won: false,
            detail: { pvpId: match.id, winnerId },
          });

          const updated = await db
            .update(clubMatchesTable)
            .set({
              state: "resolved",
              winnerId,
              rake: payout.rake,
              prize: payout.prize,
              board: moveRes.board,
              resolvedAt: new Date(),
            })
            .where(eq(clubMatchesTable.id, match.id))
            .returning();

          return res.json({ match: updated[0] });
        }

        const nextTurn = moveRes.extraTurn ? match.turnUserId : nextTurnUserId;
        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurn,
            board: moveRes.board,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();

        return res.json({ match: updated[0] });
      }

      return res.status(400).json({ error: "Invalid Ludo op: must be roll or move" });
    }

    return res.status(400).json({ error: "Unknown game" });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("handleMatchAction error:", error);
    return res.status(500).json({ error: "Failed to apply action" });
  }
}

// Handlers for Match Get
async function handleGetMatch(req: any, res: any) {
  try {
    const { id } = req.params;
    let identityUserId: string | null = null;
    try {
      const identity = await authenticateRequest(req);
      identityUserId = identity.privyUserId;
    } catch {
      // Unauthenticated view is allowed as spectator
    }

    const { db, clubMatchesTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    let match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });

    match = await applyTimeoutIfExpired(match);

    const [creatorLegend, opponentLegend] = await Promise.all([
      getLegendProfile(match.creatorId),
      match.opponentId ? getLegendProfile(match.opponentId) : null,
    ]);

    let sanitizedBoard = match.board;
    if (match.game === "21" && match.state === "live" && identityUserId) {
      sanitizedBoard = sanitize21BoardForClient(match.board as TwentyOneBoard, identityUserId);
    }

    return res.json({
      match: {
        ...match,
        board: sanitizedBoard,
      },
      creatorLegend: creatorLegend ? {
        name: creatorLegend.name,
        position: creatorLegend.position,
        perkId: creatorLegend.perkId,
        pac: creatorLegend.pac,
        sho: creatorLegend.sho,
        pas: creatorLegend.pas,
        dri: creatorLegend.dri,
        def: creatorLegend.def,
        phy: creatorLegend.phy,
      } : null,
      opponentLegend: opponentLegend ? {
        name: opponentLegend.name,
        position: opponentLegend.position,
        perkId: opponentLegend.perkId,
        pac: opponentLegend.pac,
        sho: opponentLegend.sho,
        pas: opponentLegend.pas,
        dri: opponentLegend.dri,
        def: opponentLegend.def,
        phy: opponentLegend.phy,
      } : null,
    });
  } catch (error) {
    console.error("handleGetMatch error:", error);
    return res.status(500).json({ error: "Failed to get match" });
  }
}

// Handlers for Abort (refund before first move)
async function handleAbortMatch(req: any, res: any) {
  try {
    const identity = await authenticateRequest(req);
    const { id } = req.params;

    const { db, clubMatchesTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    const match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.state === "resolved" || match.state === "aborted") {
      return res.status(400).json({ error: `Match already ${match.state}` });
    }

    const isCreator = identity.privyUserId === match.creatorId;
    const isOpponent = identity.privyUserId === match.opponentId;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ error: "Not a participant" });
    }

    // Abort allowed if open, or if live but no actions taken yet
    let canAbort = match.state === "open";
    if (match.state === "live") {
      if (match.game === "four") {
        const board = match.board as FourBoardState;
        canAbort = !board.moves || board.moves.length === 0;
      } else if (match.game === "ludo") {
        const board = match.board as LudoBoardState;
        canAbort = board.red.every((t) => t.pos === "yard") && board.yellow.every((t) => t.pos === "yard");
      } else if (match.game === "21") {
        const board = match.board as TwentyOneBoard;
        // In 21, both have 2 cards each initially
        canAbort = board.creator.hands[0].cards.length === 2 && (board.opponent?.hands[0]?.cards.length ?? 0) === 2;
      }
    }

    if (!canAbort) {
      return res.status(400).json({ error: "Cannot abort after moves have been made" });
    }

    // Refund creator
    const creatorUser = await getOrCreateUser(match.creatorId);
    await creditBought(creatorUser.id, match.creatorId, match.stake);

    // Refund opponent if joined
    if (match.opponentId) {
      const opponentUser = await getOrCreateUser(match.opponentId);
      await creditBought(opponentUser.id, match.opponentId, match.stake);
    }

    const updated = await db
      .update(clubMatchesTable)
      .set({
        state: "aborted",
        resolvedAt: new Date(),
      })
      .where(eq(clubMatchesTable.id, id))
      .returning();

    return res.json({ match: updated[0], aborted: true });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("handleAbortMatch error:", error);
    return res.status(500).json({ error: "Failed to abort match" });
  }
}

// Handlers for Rematch
async function handleRematch(req: any, res: any) {
  try {
    const identity = await authenticateRequest(req);
    const { id } = req.params;

    const { db, clubMatchesTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    const match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });

    const isCreator = identity.privyUserId === match.creatorId;
    const isOpponent = identity.privyUserId === match.opponentId;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ error: "Not a participant in this match" });
    }

    const card = await getLegendProfile(identity.privyUserId);
    if (!card || !card.profileComplete) {
      return res.status(400).json({ error: "Complete legend card before rematch." });
    }

    const user = await getOrCreateUser(identity.privyUserId);
    const debit = await debitPlayable(user.id, identity.privyUserId, match.stake);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const newMatchId = `pvp_${match.game}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let initialBoard: any;
    if (match.game === "21") {
      initialBoard = { phase: "deal" };
    } else if (match.game === "four") {
      initialBoard = createInitialFourBoard();
    } else {
      initialBoard = createInitialLudoBoard();
    }

    const created = await db
      .insert(clubMatchesTable)
      .values({
        id: newMatchId,
        game: match.game,
        ruleset: match.ruleset,
        creatorId: identity.privyUserId,
        opponentId: null,
        stake: match.stake,
        mode: "challenge",
        state: "open",
        turnUserId: identity.privyUserId,
        board: initialBoard,
        lastSeenCreator: new Date(),
      })
      .returning();

    return res.json({ match: created[0], newMatchId });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("handleRematch error:", error);
    return res.status(500).json({ error: "Failed to create rematch" });
  }
}

// Handlers for Recent Matches
async function handleGetRecent(_req: any, res: any) {
  try {
    const { db, clubMatchesTable } = await import("@workspace/db");
    const recent = await db
      .select()
      .from(clubMatchesTable)
      .where(eq(clubMatchesTable.state, "resolved"))
      .orderBy(desc(clubMatchesTable.resolvedAt))
      .limit(10);

    return res.json({ recent });
  } catch (error) {
    console.error("handleGetRecent error:", error);
    return res.status(500).json({ error: "Failed to get recent matches" });
  }
}

// MOUNT DUAL PATHS (/api/pvp and /api/club alias)
router.post("/pvp", handleCreateMatch);
router.post("/club", handleCreateMatch);

router.post("/pvp/:id/accept", handleAcceptMatch);
router.post("/club/:id/accept", handleAcceptMatch);

router.post("/pvp/:id/act", handleMatchAction);
router.post("/pvp/:id/move", handleMatchAction);
router.post("/club/:id/move", handleMatchAction);

router.get("/pvp/recent", handleGetRecent);
router.get("/club/recent", handleGetRecent);

router.get("/pvp/:id", handleGetMatch);
router.get("/club/:id", handleGetMatch);

router.post("/pvp/:id/abort", handleAbortMatch);
router.post("/club/:id/abort", handleAbortMatch);

router.post("/pvp/:id/rematch", handleRematch);
router.post("/club/:id/rematch", handleRematch);

export default router;
