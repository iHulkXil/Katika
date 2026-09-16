# Katika soft launch

## Neon (done if mint persists after Render sleep)

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

## Deploy

1. Render API deploy (after env + Neon).
2. Vercel frontend deploy.
3. `GET https://katika-w8bs.onrender.com/api/healthz` → `{ "status": "ok" }`.

## New-account loop

1. Fresh email / Google sign-in.
2. Grant **600 KTK** on floor.
3. First legend lock ≤ **333**.
4. Playable remainder must 10× rollover before realloc / remint.
5. Tables cap **50** KTK, or **75** with Stake +.
6. Mint costs **$1**. Today that is **10 KTK** unless `STRIPE_SECRET_KEY` is set on Render.

## Mint fee modes

| Env on Render | What mint does |
| --- | --- |
| no Stripe key | Debit 10 KTK (`$1` stand-in) |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` | Checkout $1, then mint |

Add later, do not block launch:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (one-time $1 price)
- `PUBLIC_APP_URL` (Vercel origin for success/cancel)

## Pass / fail

- [ ] healthz ok
- [ ] 600 grant
- [ ] 333 first-card cap
- [ ] 10× rollover math
- [ ] mint persists after Render restart
- [ ] 10 KTK leaves the floor on mint
- [ ] Stake + allows 75, rejects 80
- [ ] four tables play
