export async function recordBet(input: {
  userId: number;
  privyUserId: string;
  game: string;
  wager: number;
  payout: number;
  won: boolean;
  detail: Record<string, unknown>;
}) {
  try {
    const { db, gameBetsTable } = await import("@workspace/db");
    await db.insert(gameBetsTable).values({
      userId: input.userId,
      privyUserId: input.privyUserId,
      game: input.game,
      wager: input.wager,
      payout: input.payout,
      won: input.won,
      detail: input.detail,
    });
  } catch (error) {
    console.error("recordBet failed", error);
  }
}
