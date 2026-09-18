import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_DEMO_CREDITS = 600;
export const KTK_GRANT = 600;
export const KTK_LEGEND_CAP_RATIO = 333 / 600;
export const KTK_MAX_FIRST_ALLOC = 333;
export const KTK_ROLLOVER_X = 10;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  privyUserId: text("privy_user_id").notNull().unique(),
  demoCredits: integer("demo_credits").notNull().default(DEFAULT_DEMO_CREDITS),
  ktkGrantedWallet: integer("ktk_granted_wallet").notNull().default(0),
  ktkBoughtWallet: integer("ktk_bought_wallet").notNull().default(0),
  clashSlotsUsed: integer("clash_slots_used").notNull().default(0),
  clashSlotsDate: text("clash_slots_date"),
  walletAddress: text("wallet_address"),
  onChainKchip: integer("on_chain_kchip").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const legendsTable = pgTable("legends", {
  id: serial("id").primaryKey(),
  privyUserId: text("privy_user_id").notNull().unique(),
  name: text("name").notNull(),
  position: text("position").notNull().default("CAM"),
  pace: integer("pace").notNull().default(50),
  shooting: integer("shooting").notNull().default(50),
  passing: integer("passing").notNull().default(50),
  dribbling: integer("dribbling").notNull().default(50),
  defending: integer("defending").notNull().default(50),
  physical: integer("physical").notNull().default(50),
  perkId: text("perk_id"),
  ruleset: integer("ruleset").notNull().default(1),
  tokenId: integer("token_id"),
  mint: jsonb("mint"),
  allocatedTotal: integer("allocated_total").notNull().default(0),
  allocatedFromGrant: integer("allocated_from_grant").notNull().default(0),
  allocatedFromBought: integer("allocated_from_bought").notNull().default(0),
  rolloverBaseU0: integer("rollover_base_u0"),
  rolloverTargetR: integer("rollover_target_r"),
  profileComplete: boolean("profile_complete").notNull().default(false),
  perkId: text("perk_id"),
  ruleset: integer("ruleset").notNull().default(1),
  tokenId: integer("token_id"),
  mint: jsonb("mint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameBetsTable = pgTable("game_bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  privyUserId: text("privy_user_id").notNull(),
  game: text("game").notNull(),
  wager: integer("wager").notNull(),
  payout: integer("payout").notNull(),
  won: boolean("won").notNull(),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const minesRoundsTable = pgTable("mines_rounds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  privyUserId: text("privy_user_id").notNull(),
  wager: integer("wager").notNull(),
  minesCount: integer("mines_count").notNull(),
  mines: jsonb("mines").notNull(),
  revealed: jsonb("revealed").notNull(),
  settled: boolean("settled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashierOrdersTable = pgTable("cashier_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  packId: text("pack_id").notNull(),
  usdCents: integer("usd_cents").notNull(),
  ktk: integer("ktk").notNull(),
  stripeSession: text("stripe_session").unique(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clashesTable = pgTable("clashes", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  opponentId: text("opponent_id"),
  stake: integer("stake").notNull(),
  mode: text("mode").notNull(), // "challenge" | "queue"
  state: text("state").notNull(), // "waiting" | "lanes" | "feint" | "reroute" | "resolved" | "expired" | "cancelled"
  creatorLane: text("creator_lane"),
  opponentLane: text("opponent_lane"),
  feintLane: text("feint_lane"),
  winnerId: text("winner_id"),
  loserPays: integer("loser_pays"),
  rake: integer("rake"),
  prize: integer("prize"),
  creatorStats: jsonb("creator_stats"),
  opponentStats: jsonb("opponent_stats"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const houseRakeTable = pgTable("house_rake", {
  id: text("id").primaryKey(),
  clashId: text("clash_id"),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type Legend = typeof legendsTable.$inferSelect;
export type GameBet = typeof gameBetsTable.$inferSelect;
export type MinesRound = typeof minesRoundsTable.$inferSelect;
export type CashierOrder = typeof cashierOrdersTable.$inferSelect;
export type Clash = typeof clashesTable.$inferSelect;
export type HouseRake = typeof houseRakeTable.$inferSelect;
