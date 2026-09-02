import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const DEFAULT_DEMO_CREDITS = 1000;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  privyUserId: text("privy_user_id").notNull().unique(),
  demoCredits: integer("demo_credits").notNull().default(DEFAULT_DEMO_CREDITS),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
