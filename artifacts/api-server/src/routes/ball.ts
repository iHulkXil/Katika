import { Router, type IRouter } from "express";
import { authenticateRequest } from "../lib/privy-auth";

const router: IRouter = Router();

export const MAX_DAILY_BALLS = 3;
export const POINTS_PER_BALL = 500;

interface BallRecord {
  balls: number;
  ballsMinedToday: number;
  lastMinedDate: string;
  points: number;
}

const ballStore = new Map<string, BallRecord>();

function getTodayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

function getUserRecord(userId: string): BallRecord {
  const today = getTodayUtc();
  let record = ballStore.get(userId);
  if (!record) {
    record = {
      balls: 3, // Welcome 3 $BALL for new users so they can play immediately!
      ballsMinedToday: 0,
      lastMinedDate: today,
      points: 250,
    };
    ballStore.set(userId, record);
  } else if (record.lastMinedDate !== today) {
    record.ballsMinedToday = 0;
    record.lastMinedDate = today;
  }
  return record;
}

router.get("/ball/status", async (req, res) => {
  let userId = "guest_user";
  try {
    const identity = await authenticateRequest(req);
    userId = identity.privyUserId;
  } catch {
    if (req.query?.userId) {
      userId = String(req.query.userId);
    }
  }

  const record = getUserRecord(userId);
  return res.json({
    balls: record.balls,
    ballsMinedToday: record.ballsMinedToday,
    maxDaily: MAX_DAILY_BALLS,
    remainingDaily: Math.max(0, MAX_DAILY_BALLS - record.ballsMinedToday),
    points: record.points,
    pointsPerBall: POINTS_PER_BALL,
    lastMinedDate: record.lastMinedDate,
  });
});

router.post("/ball/mint", async (req, res) => {
  let userId = "guest_user";
  try {
    const identity = await authenticateRequest(req);
    userId = identity.privyUserId;
  } catch {
    if (req.body?.userId) {
      userId = String(req.body.userId);
    }
  }

  const record = getUserRecord(userId);
  const clientPoints = Number(req.body?.points ?? record.points);

  if (record.ballsMinedToday >= MAX_DAILY_BALLS) {
    return res.status(400).json({
      error: `Daily limit reached! You have already mined ${MAX_DAILY_BALLS}/${MAX_DAILY_BALLS} $BALL today. Resets at 00:00 UTC.`,
      balls: record.balls,
      ballsMinedToday: record.ballsMinedToday,
      maxDaily: MAX_DAILY_BALLS,
    });
  }

  if (clientPoints < POINTS_PER_BALL) {
    return res.status(400).json({
      error: `Not enough mined points to mint $BALL. Need ${POINTS_PER_BALL} points (have ${clientPoints}).`,
      balls: record.balls,
      ballsMinedToday: record.ballsMinedToday,
      points: clientPoints,
    });
  }

  record.balls += 1;
  record.ballsMinedToday += 1;
  record.points = Math.max(0, clientPoints - POINTS_PER_BALL);

  return res.json({
    success: true,
    balls: record.balls,
    ballsMinedToday: record.ballsMinedToday,
    maxDaily: MAX_DAILY_BALLS,
    remainingDaily: Math.max(0, MAX_DAILY_BALLS - record.ballsMinedToday),
    message: `Successfully minted 1 $BALL! (${record.ballsMinedToday}/${MAX_DAILY_BALLS} mined today)`,
  });
});

router.post("/ball/consume", async (req, res) => {
  let userId = "guest_user";
  try {
    const identity = await authenticateRequest(req);
    userId = identity.privyUserId;
  } catch {
    if (req.body?.userId) {
      userId = String(req.body.userId);
    }
  }

  const game = String(req.body?.game || "game");
  const record = getUserRecord(userId);

  if (record.balls < 1) {
    return res.status(402).json({
      error: "You need at least 1 $BALL to play this game. Mine points in the Mining Station to mint up to 3 $BALL daily!",
      balls: record.balls,
      needed: 1,
    });
  }

  record.balls = Math.max(0, record.balls - 1);

  return res.json({
    success: true,
    game,
    ballsRemaining: record.balls,
    message: `1 $BALL consumed to start ${game}.`,
  });
});

export default router;
