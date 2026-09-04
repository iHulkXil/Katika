CREATE TABLE IF NOT EXISTS "game_bets" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "privy_user_id" text NOT NULL,
  "game" text NOT NULL,
  "wager" integer NOT NULL,
  "payout" integer NOT NULL,
  "won" boolean NOT NULL,
  "detail" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "mines_rounds" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "privy_user_id" text NOT NULL,
  "wager" integer NOT NULL,
  "mines_count" integer NOT NULL,
  "mines" jsonb NOT NULL,
  "revealed" jsonb NOT NULL,
  "settled" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "game_bets_privy_created" ON "game_bets" ("privy_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "mines_rounds_open" ON "mines_rounds" ("privy_user_id", "settled");
