# Katika / Become A Legend — handover for the next AI

Repo: `iHulkXil/Katika`.
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel (frontend only). Do not deploy API on the `katika-api-server` Vercel project.
- DB: Neon. Auth: Privy. Visible token: **KTK**. Hide KCHIP.

Read order: this file → `ECONOMY_SPEC.md` → `CLUB_SPEC.md` → `REAL_CASINO.md` → `SOFT_LAUNCH.md` → code.

## Product

Sign up → 600 grant → first card ≤333 → 10× rollover on leftover grant → house tables + P2P Clash + Club + licensed slots via aggregator.
Six FIFA stats. One perk. Licence approved.

## Economy freeze

`ECONOMY_SPEC.md` — cashier, two-ledger KTK, Clash lanes.

## Club freeze

`CLUB_SPEC.md` — Connect Four then 2-player Ludo Quick. Clash money, no Clash lanes.

## Real slots (2026-09-20)

`REAL_CASINO.md` — Big Bass / Gates of Olympus / volcano-class titles are **provider games**, launched in an iframe after a Pragmatic or aggregator contract. **Do not clone them.** Seamless wallet callbacks + `provider_games` table. Empty lobby until `CASINO_PROVIDER` is set.

## Neon reminders (owner must run after a wipe)

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

Economy: `ECONOMY_SPEC.md` §8. Club: `CLUB_SPEC.md` §4. Slots: `REAL_CASINO.md` §4.

## Vercel

- Node 20.x
- Install: `npx --yes pnpm@9.15.9 install --filter @workspace/katika-bet... --no-frozen-lockfile`
- Build: `npx --yes pnpm@9.15.9 --filter @workspace/katika-bet run build`
- Output: `artifacts/katika-bet/dist/public`

## Owner preferences

KTK not KCHIP in UI. Keep 6 stats. Do not pirate slot IP. Update handover + spec files after every design cut.
