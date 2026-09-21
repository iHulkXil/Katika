# Katika / Become A Legend — handover for the next AI

Repo: `iHulkXil/Katika`.
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel only for frontend. API is Render.
- DB: Neon. Auth: Privy. Visible token: **KTK**. Hide KCHIP.

Read order: this file → `ECONOMY_SPEC.md` → `PVP_SPEC.md` → `CLUB_SPEC.md` → `REAL_CASINO.md` → `SOFT_LAUNCH.md` → code.

## Product floors

- **House** — dice, coinflip, mines, roulette (player vs book). Stats never touch RTP.
- **PvP** — **21** (replaces Clash lanes), Connect Four, Ludo Quick. Escrow + 4% rake.
- **Casino** — aggregator slots later. Do not clone PP titles.

Clash type-triangle in `ECONOMY_SPEC.md` §5–6 is **retired** for the card sport. Use `PVP_SPEC.md`.

## Economy

600 grant, first card ≤333, 10× rollover on leftover grant. Perk catalog unchanged.

## Owner 2026-09-21

Reinvent Clash as P2P closest-to-21. Stats gate Double / Split / Glance / clock / soak / slots. Merge Clash+Club under PvP.

## Neon reminders

Perk columns on `legends` already specified. Economy §8. Club/PvP tables in those specs.

## Vercel

Node 20. Install: `npx --yes pnpm@9.15.9 install --filter @workspace/katika-bet... --no-frozen-lockfile`
