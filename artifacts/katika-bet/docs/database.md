# Katika.Bet database plan (future only)

No database is implemented in Sprint 1. This document records a possible future schema and is not an instruction to create tables yet.

## Candidate entities

- `users`: internal user id, wallet identity reference, created/updated timestamps.
- `wallet_connections`: user id, chain/network, public address, connection metadata, connected/disconnected timestamps.
- `games`: stable slug, display name, description, status, configuration reference.
- `game_sessions`: user id, game id, session status, created/ended timestamps. No financial fields should be added without a separate product and compliance review.
- `rewards`: user id, reward type, status, issued/claimed timestamps.
- `leaderboard_snapshots`: period, user id, score/rank, generated timestamp.

## Principles

Use immutable event records for consequential actions, UTC timestamps, stable public ids, and wallet addresses as identifiers rather than balances. Add auditability and retention rules before any production game or rewards data is introduced. Sprint 1 must remain free of account, transaction, balance, or demo-credit persistence.