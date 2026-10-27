# SIDEBET — handover

Repo: `iHulkXil/Katika` (rebranded to SIDEBET).
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel frontend.
- DB: Neon. Auth: Privy (multi-chain: EVM + Solana).
- Visible unit: none. $SBET internal only.

## Current focus

Homepage is a rich live feed of upcoming prediction events (categories, live badges, days left, volume, Yes/No bars).
- Users create events → mints a Solana NFT (devnet) as proof of bet.
- Others buy Yes or No shares.
- Mining system completely removed (files + routes + nav).
- Legend system and $KTK UI fully removed.
- Color scheme unchanged (dark emerald).

PvP and classic casino tables remain under their nav items.

Read order: this file → `artifacts/katika-bet/src/components/markets-home.tsx`.
