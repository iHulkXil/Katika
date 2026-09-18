import { eq, sql } from "drizzle-orm";

export const KTK_GRANT = 600;
export const KTK_FIRST_CAP = 333;
export const KTK_ROLLOVER_X = 10;
export const BASE_CLASH_SLOTS = 5;
export const HOUSE_EDGE = 0.06; // 6 percent house edge pegged
export const CLASH_RAKE_RATE = 0.06; // 6 percent rake pegged

export function ktkRolloverNeed(remainingGrant: number = KTK_GRANT - KTK_FIRST_CAP) {
  return Math.max(0, remainingGrant) * KTK_ROLLOVER_X;
}

export function maxWagerForPerk(perkId?: string | null): number {
  return perkId === "stake_plus" ? 75 : 50;
}

export function calculateDailySlots(physicalStat: number = 50): number {
  const bonus = Math.max(0, Math.min(3, Math.floor((physicalStat - 40) / 20)));
  return BASE_CLASH_SLOTS + bonus;
}

export function getTodayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getOrCreateUser(privyUserId: string) {
  const { db, usersTable } = await import("@workspace/db");
  const existing = await db.select().from(usersTable).where(eq(usersTable.privyUserId, privyUserId)).limit(1);
  let user = existing[0];

  if (!user) {
    const inserted = await db.insert(usersTable).values({
      privyUserId,
      demoCredits: KTK_GRANT,
      ktkGrantedWallet: KTK_GRANT,
      ktkBoughtWallet: 0,
      clashSlotsUsed: 0,
      clashSlotsDate: getTodayUtc(),
    }).returning();
    user = inserted[0];
  } else {
    // Migration: if both wallets 0 and demo_credits > 0, migrate
    let needsUpdate = false;
    const updates: Record<string, any> = {};

    if (user.ktkGrantedWallet === 0 && user.ktkBoughtWallet === 0 && (user.demoCredits ?? 0) > 0) {
      updates.ktkGrantedWallet = user.demoCredits;
      needsUpdate = true;
    }

    // Daily stamina slot rollover
    const today = getTodayUtc();
    if (user.clashSlotsDate !== today) {
      updates.clashSlotsDate = today;
      updates.clashSlotsUsed = 0;
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.updatedAt = new Date();
      const updated = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
      if (updated[0]) user = updated[0];
    }
  }

  return user;
}

export async function getKtkEconomy(privyUserId: string, _fallbackCredits?: number) {
  const { db, legendsTable, gameBetsTable } = await import("@workspace/db");
  const user = await getOrCreateUser(privyUserId);
  const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
  const card = cards[0];

  const allocated = card
    ? card.pace + card.shooting + card.passing + card.dribbling + card.defending + card.physical
    : 0;

  const volumeRows = await db.select({
    volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
  }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, privyUserId));
  const wagered = Number(volumeRows[0]?.volume ?? 0);

  // Rollover requirement R
  const rolloverNeed = card?.rolloverTargetR ?? (card?.rolloverBaseU0 !== undefined && card?.rolloverBaseU0 !== null
    ? card.rolloverBaseU0 * KTK_ROLLOVER_X
    : ktkRolloverNeed());
  const rolloverLeft = Math.max(0, rolloverNeed - wagered);
  const unlocked = wagered >= rolloverNeed;

  const grantedWallet = Number(user.ktkGrantedWallet ?? 0);
  const boughtWallet = Number(user.ktkBoughtWallet ?? 0);
  const playable = grantedWallet + boughtWallet;

  const perkId = card?.perkId ?? null;
  const maxWager = maxWagerForPerk(perkId);
  const dailySlots = calculateDailySlots(card?.physical ?? 50);
  const slotsUsed = Number(user.clashSlotsUsed ?? 0);
  const stamina = Math.max(0, dailySlots - slotsUsed);

  const feeMode = process.env.STRIPE_SECRET_KEY ? "stripe" : "ktk_standin";

  return {
    ktk: playable,
    demoCredits: playable,
    playable,
    grantedWallet,
    boughtWallet,
    allocated,
    lockedCard: allocated,
    wagered,
    rolloverNeed,
    rolloverLeft,
    unlocked,
    maxWager,
    feeMode,
    dailySlots,
    slotsUsed,
    stamina,
    perkId,
    profileComplete: Boolean(card?.profileComplete),
    token: "KTK",
    houseEdge: HOUSE_EDGE,
    clashRakeRate: CLASH_RAKE_RATE,
  };
}

export async function debitPlayable(
  userId: number,
  privyUserId: string,
  amount: number,
): Promise<{
  success: boolean;
  error?: string;
  debitedBought: number;
  debitedGrant: number;
  playable: number;
  user: any;
}> {
  if (amount <= 0) {
    return { success: false, error: "Amount must be positive", debitedBought: 0, debitedGrant: 0, playable: 0, user: null };
  }

  const { db, usersTable } = await import("@workspace/db");
  const user = await getOrCreateUser(privyUserId);
  const bought = Number(user.ktkBoughtWallet ?? 0);
  const grant = Number(user.ktkGrantedWallet ?? 0);
  const total = bought + grant;

  if (amount > total) {
    return { success: false, error: "Not enough KTK", debitedBought: 0, debitedGrant: 0, playable: total, user };
  }

  // Spend order: bought B first, then grant G
  let debitedBought = 0;
  let debitedGrant = 0;
  let newBought = bought;
  let newGrant = grant;

  if (amount <= bought) {
    debitedBought = amount;
    newBought = bought - amount;
  } else {
    debitedBought = bought;
    newBought = 0;
    debitedGrant = amount - bought;
    newGrant = grant - debitedGrant;
  }

  const newPlayable = newBought + newGrant;
  const updated = await db.update(usersTable).set({
    ktkBoughtWallet: newBought,
    ktkGrantedWallet: newGrant,
    demoCredits: newPlayable,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId)).returning();

  return {
    success: true,
    debitedBought,
    debitedGrant,
    playable: newPlayable,
    user: updated[0] ?? user,
  };
}

export async function creditBought(
  userId: number,
  privyUserId: string,
  amount: number,
) {
  if (amount <= 0) return { success: true, added: 0 };
  const { db, usersTable } = await import("@workspace/db");
  const user = await getOrCreateUser(privyUserId);
  const currentBought = Number(user.ktkBoughtWallet ?? 0);
  const currentGrant = Number(user.ktkGrantedWallet ?? 0);
  const newBought = currentBought + amount;
  const newPlayable = newBought + currentGrant;

  const updated = await db.update(usersTable).set({
    ktkBoughtWallet: newBought,
    demoCredits: newPlayable,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId)).returning();

  return {
    success: true,
    added: amount,
    newBought,
    playable: newPlayable,
    user: updated[0],
  };
}

export async function refundDebited(
  userId: number,
  privyUserId: string,
  debitedBought: number,
  debitedGrant: number,
) {
  const { db, usersTable } = await import("@workspace/db");
  const user = await getOrCreateUser(privyUserId);
  const newBought = Number(user.ktkBoughtWallet ?? 0) + debitedBought;
  const newGrant = Number(user.ktkGrantedWallet ?? 0) + debitedGrant;
  const newPlayable = newBought + newGrant;

  await db.update(usersTable).set({
    ktkBoughtWallet: newBought,
    ktkGrantedWallet: newGrant,
    demoCredits: newPlayable,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));
}

export async function useStaminaSlot(privyUserId: string): Promise<{ success: boolean; error?: string; staminaRemaining?: number }> {
  const { db, usersTable, legendsTable } = await import("@workspace/db");
  const user = await getOrCreateUser(privyUserId);
  const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
  const card = cards[0];

  const maxSlots = calculateDailySlots(card?.physical ?? 50);
  const used = Number(user.clashSlotsUsed ?? 0);

  if (used >= maxSlots) {
    return { success: false, error: "No stamina left for today. Daily slots refresh at 00:00 UTC." };
  }

  const updated = await db.update(usersTable).set({
    clashSlotsUsed: used + 1,
    clashSlotsDate: getTodayUtc(),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id)).returning();

  const remaining = Math.max(0, maxSlots - (updated[0]?.clashSlotsUsed ?? (used + 1)));
  return { success: true, staminaRemaining: remaining };
}

