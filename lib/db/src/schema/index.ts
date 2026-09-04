import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_DEMO_CREDITS = 1000;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  privyUserId: text("privy_user_id").notNull().unique(),
  demoCredits: integer("demo_credits").notNull().default(DEFAULT_DEMO_CREDITS),
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

export type User = typeof usersTable.$inferSelect;
export type GameBet = typeof gameBetsTable.$inferSelect;
export type MinesRound = typeof minesRoundsTable.$inferSelect;
