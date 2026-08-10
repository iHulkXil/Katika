# Katika.Bet Database Plan

Sprint 1 does not create application tables or store user/account data. This document records the intended direction for later sprints without implying that any functionality is live.

## Planned entities

- `users` — application identity and account lifecycle
- `profiles` — display preferences and public profile information
- `wallets` — wallet addresses and connection metadata
- `transactions` — future ledger records; never used for Sprint 1
- `games` — game catalog and availability
- `game_sessions` — future round/session records
- `game_seeds` — provably fair seed commitments and reveals
- `rewards` — reward definitions and claims
- `missions` — mission definitions and progress rules
- `referrals` — referral relationships and attribution
- `leaderboards` — ranked-period configuration and results
- `admin_users` — administrative roles
- `audit_logs` — security and administrative history

## Guardrails

Future schema work should use the built-in Replit PostgreSQL database through the shared database library and migrations. Financial or wallet-related writes must be server-owned, validated, auditable, and introduced only in the sprint that explicitly requires them.

No table in this plan should be treated as populated during Sprint 1. The UI must continue to use explicit “Coming Soon” states rather than fabricated balances, transactions, or rankings.
