# Sprint 3 — demo credits

Adds a non-cash `demo_credits` balance on `users`. Default 1000 on first insert. Existing users get 1000 via column default.

No deposits, withdrawals, games, or ledgers of bets.

After pull: `pnpm --filter @workspace/db run push` then restart API + Vite.
