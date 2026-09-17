# Katika / Become A Legend — handover for the next AI

Repo: `iHulkXil/Katika`.
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel (frontend only). Do not deploy API on the `katika-api-server` Vercel project.
- DB: Neon. Auth: Privy. Visible token: **KTK**. Hide KCHIP.

Read order: this file → `ECONOMY_SPEC.md` → `CLUB_SPEC.md` → `SOFT_LAUNCH.md` → code.

## Product

Sign up → 600 grant → first card ≤333 → 10× rollover on leftover grant → house tables + P2P Clash + Club (Four, Ludo Quick). Six FIFA stats. One perk. Licence approved.

## Economy freeze

`ECONOMY_SPEC.md` — cashier, two-ledger KTK, Clash lanes.

## Club freeze (2026-09-17)

`CLUB_SPEC.md` — Connect Four then 2-player Ludo Quick.
Uses Clash money (escrow, 4% rake, maxWager, stamina). **Ignores Clash lanes.**
No 4-player Ludo. Server RNG. Four must pay out on staging before Ludo UI.

## Neon reminders (owner must run after a wipe)

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

Economy columns: `ECONOMY_SPEC.md` §8.
Club table: `CLUB_SPEC.md` §4.

## Vercel (working as of 2026-09-17)

- Node 20.x
- Install: `npx --yes pnpm@9.15.9 install --filter @workspace/katika-bet... --no-frozen-lockfile`
- Build: `npx --yes pnpm@9.15.9 --filter @workspace/katika-bet run build`
- Output: `artifacts/katika-bet/dist/public`
- Dashboard Install Command must match vercel.json.

## Owner preferences

KTK not KCHIP in UI. Keep 6 stats. Update handover + spec files after every design cut.
