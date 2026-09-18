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

const router: IRouter = Router();

// Timeout constants
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

/**
 * Checks and executes auto-move if clock expired
 */
async function applyTimeoutIfExpired(match: any): Promise<any> {
  if (match.state !== "live") return match;

  const now = Date.now();
  const lastActionTime = match.resolvedAt
    ? new Date(match.resolvedAt).getTime()
    : new Date(match.createdAt).getTime();

  const timeoutMs = match.game === "four" ? FOUR_TIMEOUT_MS : LUDO_TIMEOUT_MS;
  const elapsed = now - lastActionTime;

  if (elapsed < timeoutMs) {
    return match; // Clock still running
  }

  const { db, clubMatchesTable, houseRakeTable, usersTable } = await import("@workspace/db");

  // Four Auto-Drop
  if (match.game === "four") {
    const board = match.board as FourBoardState;
    const openCols = legalCols(board.cells);

    if (openCols.length === 0) {
      // Board is full -> Draw
      const creatorUser = await getOrCreateUser(match.creatorId);
      const opponentUser = await getOrCreateUser(match.opponentId);
      await creditBought(creatorUser.id, match.creatorId, match.stake);
      await creditBought(opponentUser.id, match.opponentId, match.stake);

      await recordBet({
        userId: creatorUser.id,
        privyUserId: match.creatorId,
        game: "club_four",
        wager: match.stake,
        payout: 0,
        won: false,
        detail: { clubId: match.id, result: "draw" },
      });
      await recordBet({
        userId: opponentUser.id,
        privyUserId: match.opponentId,
        game: "club_four",
        wager: match.stake,
        payout: 0,
        won: false,
        detail: { clubId: match.id, result: "draw" },
      });

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

    // Drop in leftmost open column
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

      await recordBet({
        userId: winnerUser.id,
        privyUserId: winnerId,
        game: "club_four",
        wager: match.stake,
        payout: payout.prize - match.stake,
        won: true,
        detail: { clubId: match.id, winnerId, timeout: true },
      });
      await recordBet({
        userId: loserUser.id,
        privyUserId: loserId,
        game: "club_four",
        wager: match.stake,
        payout: -match.stake,
        won: false,
        detail: { clubId: match.id, winnerId, timeout: true },
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

    if (isFull(dropRes.cells)) {
      // Draw
      const creatorUser = await getOrCreateUser(match.creatorId);
      const opponentUser = await getOrCreateUser(match.opponentId);
      await creditBought(creatorUser.id, match.creatorId, match.stake);
      await creditBought(opponentUser.id, match.opponentId, match.stake);

      const updated = await db
        .update(clubMatchesTable)
        .set({
          state: "resolved",
          rake: 0,
          prize: 0,
          board: { cells: dropRes.cells, moves: nextMoves },
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();
      return updated[0] ?? match;
    }

    // Switch turn
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

  // Ludo Auto-Action
  if (match.game === "ludo") {
    let board = match.board as LudoBoardState;
    const isCreatorTurn = match.turnUserId === match.creatorId;
    const currentColor: LudoColor = isCreatorTurn ? "red" : "yellow";

    // If awaiting roll, auto-roll
    if (board.phase === "await_roll") {
      const rollRes = applyLudoRoll(board, currentColor);
      board = rollRes.nextBoard;
      if (rollRes.turnPassed) {
        const nextTurnUserId = isCreatorTurn ? match.opponentId : match.creatorId;
        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurnUserId,
            board,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return updated[0] ?? match;
      }
    }

    // If awaiting move, auto-move token furthest from home
    if (board.phase === "await_move" && board.legal.length > 0) {
      const tokens = currentColor === "red" ? board.red : board.yellow;
      // Sort legal tokens by distance to home descending
      const sorted = [...board.legal].sort((a, b) => {
        return distanceToHome(tokens[b], currentColor) - distanceToHome(tokens[a], currentColor);
      });
      const tokenToMove = sorted[0] as 0 | 1;

      const moveRes = applyLudoMove(board, currentColor, tokenToMove);

      if (moveRes.winner) {
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
          game: "club_ludo",
          wager: match.stake,
          payout: payout.prize - match.stake,
          won: true,
          detail: { clubId: match.id, winnerId, timeout: true },
        });
        await recordBet({
          userId: loserUser.id,
          privyUserId: loserId,
          game: "club_ludo",
          wager: match.stake,
          payout: -match.stake,
          won: false,
          detail: { clubId: match.id, winnerId, timeout: true },
        });

        const updated = await db
          .update(clubMatchesTable)
          .set({
            state: "resolved",
            winnerId,
            rake: payout.rake,
            prize: payout.prize,
            board: moveRes.nextBoard,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return updated[0] ?? match;
      }

      const nextTurnUserId = moveRes.nextTurnColor === currentColor
        ? match.turnUserId
        : (isCreatorTurn ? match.opponentId : match.creatorId);

      const updated = await db
        .update(clubMatchesTable)
        .set({
          turnUserId: nextTurnUserId,
          board: moveRes.nextBoard,
          resolvedAt: new Date(),
        })
        .where(eq(clubMatchesTable.id, match.id))
        .returning();
      return updated[0] ?? match;
    }
  }

  return match;
}

/**
 * POST /api/club
 * Create a queue search or challenge
 */
router.post("/club", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const game = req.body?.game === "ludo" ? "ludo" : "four";
    const mode = req.body?.mode === "challenge" ? "challenge" : "queue";
    const stake = Number(req.body?.stake ?? 10);

    const card = await getLegendProfile(identity.privyUserId);
    if (!card || !card.profileComplete) {
      return res.status(400).json({ error: "Create and allocate your Legend card before entering Club." });
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

    // If queue mode, check for an existing open queue match with the same game and stake
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

        // Consume stamina for both players
        await useStaminaSlot(available.creatorId);
        await useStaminaSlot(identity.privyUserId);

        const initialBoard = game === "four" ? createInitialFourBoard() : createInitialLudoBoard();

        const updated = await db
          .update(clubMatchesTable)
          .set({
            opponentId: identity.privyUserId,
            state: "live",
            turnUserId: available.creatorId, // Creator plays first (red)
            board: initialBoard,
            lastSeenOpponent: new Date(),
            resolvedAt: new Date(), // Action timer start
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

    const matchId = `club_${game}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const initialBoard = game === "four" ? createInitialFourBoard() : createInitialLudoBoard();

    const created = await db
      .insert(clubMatchesTable)
      .values({
        id: matchId,
        game,
        ruleset: game === "four" ? "four_v1" : "ludo_quick_v1",
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
    console.error("POST /api/club error:", error);
    return res.status(500).json({ error: "Failed to create club match" });
  }
});

/**
 * POST /api/club/:id/accept
 * Opponent accepts a challenge
 */
router.post("/club/:id/accept", async (req, res) => {
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
      return res.status(400).json({ error: "Create and allocate your Legend card before entering Club." });
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

    // Burn stamina slots for both players
    await useStaminaSlot(match.creatorId);
    await useStaminaSlot(identity.privyUserId);

    const initialBoard = match.game === "four" ? createInitialFourBoard() : createInitialLudoBoard();

    const updated = await db
      .update(clubMatchesTable)
      .set({
        opponentId: identity.privyUserId,
        state: "live",
        turnUserId: match.creatorId, // Red/Creator goes first
        board: initialBoard,
        lastSeenOpponent: new Date(),
        resolvedAt: new Date(), // Action timer
      })
      .where(eq(clubMatchesTable.id, id))
      .returning();

    return res.json({ match: updated[0] });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("POST /api/club/:id/accept error:", error);
    return res.status(500).json({ error: "Failed to accept match" });
  }
});

/**
 * POST /api/club/:id/move
 */
router.post("/club/:id/move", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { id } = req.params;

    const { db, clubMatchesTable, houseRakeTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    let match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });

    // Check timeout first
    match = await applyTimeoutIfExpired(match);
    if (match.state !== "live") {
      return res.status(400).json({ error: `Match is already ${match.state}`, match });
    }

    // Must be user's turn
    if (match.turnUserId !== identity.privyUserId) {
      return res.status(400).json({ error: "Not your turn", match });
    }

    const isCreator = identity.privyUserId === match.creatorId;

    // 1. CONNECT FOUR MOVE
    if (match.game === "four") {
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
          game: "club_four",
          wager: match.stake,
          payout: payout.prize - match.stake,
          won: true,
          detail: { clubId: match.id, winnerId },
        });
        await recordBet({
          userId: loserUser.id,
          privyUserId: loserId,
          game: "club_four",
          wager: match.stake,
          payout: -match.stake,
          won: false,
          detail: { clubId: match.id, winnerId },
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

      if (isFull(dropRes.cells)) {
        // Draw: refund both stakes, rake 0
        const creatorUser = await getOrCreateUser(match.creatorId);
        const opponentUser = await getOrCreateUser(match.opponentId);
        await creditBought(creatorUser.id, match.creatorId, match.stake);
        await creditBought(opponentUser.id, match.opponentId, match.stake);

        await recordBet({
          userId: creatorUser.id,
          privyUserId: match.creatorId,
          game: "club_four",
          wager: match.stake,
          payout: 0,
          won: false,
          detail: { clubId: match.id, result: "draw" },
        });
        await recordBet({
          userId: opponentUser.id,
          privyUserId: match.opponentId,
          game: "club_four",
          wager: match.stake,
          payout: 0,
          won: false,
          detail: { clubId: match.id, result: "draw" },
        });

        const updated = await db
          .update(clubMatchesTable)
          .set({
            state: "resolved",
            rake: 0,
            prize: 0,
            board: { cells: dropRes.cells, moves: nextMoves },
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return res.json({ match: updated[0] });
      }

      // Switch turn
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

    // 2. LUDO QUICK MOVE
    if (match.game === "ludo") {
      const op = req.body?.op;
      const currentColor: LudoColor = isCreator ? "red" : "yellow";
      let board = match.board as LudoBoardState;

      if (op === "roll") {
        if (board.phase !== "await_roll") {
          return res.status(400).json({ error: "Already rolled, move a token" });
        }

        const rollRes = applyLudoRoll(board, currentColor);
        const nextTurnUserId = rollRes.turnPassed
          ? (isCreator ? match.opponentId : match.creatorId)
          : match.turnUserId;

        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurnUserId,
            board: rollRes.nextBoard,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return res.json({ match: updated[0] });
      }

      if (op === "move") {
        if (board.phase !== "await_move") {
          return res.status(400).json({ error: "Roll dice first" });
        }

        const token = Number(req.body?.token);
        if (token !== 0 && token !== 1) {
          return res.status(400).json({ error: "Invalid token (0 or 1)" });
        }

        if (!board.legal.includes(token)) {
          return res.status(400).json({ error: "Token cannot legally move" });
        }

        const moveRes = applyLudoMove(board, currentColor, token as 0 | 1);

        if (moveRes.winner) {
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
            game: "club_ludo",
            wager: match.stake,
            payout: payout.prize - match.stake,
            won: true,
            detail: { clubId: match.id, winnerId },
          });
          await recordBet({
            userId: loserUser.id,
            privyUserId: loserId,
            game: "club_ludo",
            wager: match.stake,
            payout: -match.stake,
            won: false,
            detail: { clubId: match.id, winnerId },
          });

          const updated = await db
            .update(clubMatchesTable)
            .set({
              state: "resolved",
              winnerId,
              rake: payout.rake,
              prize: payout.prize,
              board: moveRes.nextBoard,
              resolvedAt: new Date(),
            })
            .where(eq(clubMatchesTable.id, match.id))
            .returning();
          return res.json({ match: updated[0] });
        }

        const nextTurnUserId = moveRes.nextTurnColor === currentColor
          ? match.turnUserId
          : (isCreator ? match.opponentId : match.creatorId);

        const updated = await db
          .update(clubMatchesTable)
          .set({
            turnUserId: nextTurnUserId,
            board: moveRes.nextBoard,
            resolvedAt: new Date(),
          })
          .where(eq(clubMatchesTable.id, match.id))
          .returning();
        return res.json({ match: updated[0] });
      }

      return res.status(400).json({ error: "Invalid op (roll or move)" });
    }

    return res.status(400).json({ error: "Unknown game" });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("POST /api/club/:id/move error:", error);
    return res.status(500).json({ error: "Failed to apply move" });
  }
});

/**
 * POST /api/club/:id/abort
 * Abort before first move = full refund
 */
router.post("/club/:id/abort", async (req, res) => {
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

    if (match.state === "open") {
      // Creator cancelling open challenge
      const creatorUser = await getOrCreateUser(match.creatorId);
      await creditBought(creatorUser.id, match.creatorId, match.stake);

      const updated = await db
        .update(clubMatchesTable)
        .set({ state: "aborted", resolvedAt: new Date() })
        .where(eq(clubMatchesTable.id, id))
        .returning();
      return res.json({ match: updated[0], refunded: true });
    }

    if (match.state === "live") {
      // Check if any legal move was committed
      let hasMoves = false;
      if (match.game === "four") {
        hasMoves = ((match.board as FourBoardState)?.moves?.length ?? 0) > 0;
      } else if (match.game === "ludo") {
        const board = match.board as LudoBoardState;
        const redYard = board?.red?.every((t) => t.pos === "yard") ?? true;
        const yellowYard = board?.yellow?.every((t) => t.pos === "yard") ?? true;
        hasMoves = !redYard || !yellowYard;
      }

      if (!hasMoves) {
        // Abort before first move: full refund to both players!
        const creatorUser = await getOrCreateUser(match.creatorId);
        await creditBought(creatorUser.id, match.creatorId, match.stake);

        if (match.opponentId) {
          const opponentUser = await getOrCreateUser(match.opponentId);
          await creditBought(opponentUser.id, match.opponentId, match.stake);
        }

        const updated = await db
          .update(clubMatchesTable)
          .set({ state: "aborted", resolvedAt: new Date() })
          .where(eq(clubMatchesTable.id, id))
          .returning();
        return res.json({ match: updated[0], refunded: true });
      }

      return res.status(400).json({ error: "Match is in progress and moves have been made." });
    }

    return res.status(400).json({ error: `Cannot abort a match in state ${match.state}` });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    console.error("POST /api/club/:id/abort error:", error);
    return res.status(500).json({ error: "Failed to abort match" });
  }
});

/**
 * POST /api/club/:id/rematch
 * Creates a NEW match with same game + stake
 */
router.post("/club/:id/rematch", async (req, res) => {
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

    const newMatchId = `club_${match.game}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const initialBoard = match.game === "four" ? createInitialFourBoard() : createInitialLudoBoard();

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
    console.error("POST /api/club/:id/rematch error:", error);
    return res.status(500).json({ error: "Failed to create rematch" });
  }
});

/**
 * GET /api/club/recent
 * Last 10 resolved club matches
 */
router.get("/club/recent", async (_req, res) => {
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
    console.error("GET /api/club/recent error:", error);
    return res.status(500).json({ error: "Failed to get recent matches" });
  }
});

/**
 * GET /api/club/:id
 */
router.get("/club/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { db, clubMatchesTable } = await import("@workspace/db");
    const matches = await db.select().from(clubMatchesTable).where(eq(clubMatchesTable.id, id)).limit(1);
    let match = matches[0];

    if (!match) return res.status(404).json({ error: "Match not found" });

    // Apply timeout check if live
    match = await applyTimeoutIfExpired(match);

    // Fetch creator and opponent legend profiles
    const [creatorLegend, opponentLegend] = await Promise.all([
      getLegendProfile(match.creatorId),
      match.opponentId ? getLegendProfile(match.opponentId) : null,
    ]);

    return res.json({
      match,
      creatorLegend: creatorLegend ? {
        name: creatorLegend.name,
        position: creatorLegend.position,
        perkId: creatorLegend.perkId,
      } : null,
      opponentLegend: opponentLegend ? {
        name: opponentLegend.name,
        position: opponentLegend.position,
        perkId: opponentLegend.perkId,
      } : null,
    });
  } catch (error) {
    console.error("GET /api/club/:id error:", error);
    return res.status(500).json({ error: "Failed to get match" });
  }
});

export default router;
