# Real casino slots (Big Bass, Olympus, volcano-class)

Owner asked to “implement real casino games like Big Bass, Gods of Olympus, volcano.”
Those titles are **other companies’ products** (Pragmatic Play and similar). We do **not** clone their art, names, math, or features.

How licensed operators actually ship them: **aggregator + seamless wallet + iframe launch**.

Read `HANDOVER.md` then this file. Do not add a fake `big-bass-page.tsx`.

---

## 0. Hard no

- Do not name a house game Big Bass, Gates of Olympus, Sweet Bonanza, Coin Volcano, or lookalike spelling.
- Do not copy their reel strips, scatter/free-spin rules, or asset packs.
- Do not point `Math.random` at a 5-reel grid and call it certified.
- House originals (dice, flip, mines, roulette) stay on Katika. Slots of that class come from a provider who already has GLI / eCOGRA / iTech on the title.

---

## 1. What “like Big Bass / Olympus / volcano” means in a catalogue

Once you have a Pragmatic (or aggregator) contract, you launch **their** game ids, for example:

| Player name | Typical provider | You store |
| --- | --- | --- |
| Big Bass Bonanza family | Pragmatic Play | their `gameId` / symbol |
| Gates of Olympus | Pragmatic Play | their `gameId` |
| Volcano / Coin Volcano class | BGaming / PP / other | their `gameId` |

We never hardcode those ids until the contract pack arrives. Use env + `provider_games` table.

---

## 2. Integration model (freeze)

**Seamless wallet.** Katika remains source of truth for KTK / later real cash. Provider calls us.

```
Player taps tile
  → POST /api/casino/launch { providerGameId }
  → we create session token, ask provider StartGame / getGameUrl
  → frontend loads URL in iframe /play/casino/:sessionId
Provider during play:
  → POST /api/casino/wallet/balance
  → POST /api/casino/wallet/bet      debit
  → POST /api/casino/wallet/win      credit
  → POST /api/casino/wallet/rollback idempotent undo
```

Hash every callback with the provider secret. Reject bad signature.
Idempotent on `transactionId`. Same id twice = same result, no double debit.

Balances in **integer minor units** (KTK is already whole; fiat later = cents).

Spend order when real cash exists: follow `ECONOMY_SPEC.md` (bought first). Until then, debit playable KTK only. **Do not** let provider games spend allocated card points.

Stats (PAC…PHY) **never** change slot RTP.

---

## 3. API we own (implement when credentials exist)

```
GET  /api/casino/lobby          // rows from provider_games where enabled
POST /api/casino/launch         { providerGameId }
POST /api/casino/wallet/*       // provider → us; IP allowlist + HMAC
```

`launch` requires:

- Privy session
- KYC + geo when real-money flag is on (see previous compliance note)
- `profileComplete` only if owner wants card-gate; default for slots: **do not** require a legend. Slots are the casino floor; Clash/Club need the card.

Return `{ url, sessionId }`. Frontend iframe `url`. Sandbox demo mode: provider currency `XXX` / demo flag, no debit.

Env (Render):

```
CASINO_PROVIDER=none|pragmatic|aggregator_x
CASINO_API_URL=
CASINO_OPERATOR_ID=
CASINO_SECRET=
CASINO_WALLET_PATH_SECRET=
CASINO_ALLOWED_IPS=
```

If `CASINO_PROVIDER=none`, lobby shows “Slots coming — licence live, catalogue pending contract”. No fake reels.

---

## 4. Neon

```sql
CREATE TABLE IF NOT EXISTS provider_games (
  id text PRIMARY KEY,
  provider text NOT NULL,
  provider_game_id text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,          -- slot | live | table
  thumbnail_url text,
  enabled boolean NOT NULL DEFAULT false,
  UNIQUE (provider, provider_game_id)
);

CREATE TABLE IF NOT EXISTS casino_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  provider text NOT NULL,
  provider_game_id text NOT NULL,
  token text NOT NULL UNIQUE,
  state text NOT NULL,             -- open | closed
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS casino_tx (
  id text PRIMARY KEY,             -- provider transactionId
  session_id text NOT NULL,
  user_id text NOT NULL,
  kind text NOT NULL,              -- bet | win | rollback | balance
  amount integer NOT NULL,
  balance_after integer,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Do not insert Big Bass rows until the contract lists the official id.

---

## 5. Frontend

- `/casino` lobby grid (Stake-like tiles, current colour scheme).
- `/casino/play/:sessionId` full-bleed iframe + “Back to Katika”.
- Do not screenshot-scrape PP assets into the repo. Use the thumbnail URL the provider gives after contract.
- Until `CASINO_PROVIDER` is set: lobby empty state, not cloned reels.

---

## 6. Owner checklist (not code)

1. Confirm which **legal entity + licence number** is on the public register.
2. Apply to **one** aggregator or directly to Pragmatic as operator (they will ask licence, site URL, jurisdictions, wallet callback).
3. Get sandbox keys. Wire §3 against sandbox. Play Big Bass **in their iframe**.
4. KYC + geo + RG before flipping sandbox → prod.
5. Prod: enable three titles only (Bass, Olympus, one volcano-class) and measure. Do not dump 4,000 games on day one.

---

## 7. If you want a playable slot *now* without a contract

That is a **new original** house game with its own name (e.g. “Katika Reels”), own math sheet, no PP look. It is **not** Big Bass. It cannot be marketed as those titles. It is not lab-certified. Keep it off real-money until a lab signs it.

Do not build that unless the owner explicitly says “original house slot, new name.”

---

## 8. Build order for the implementing AI

1. Tables in §4.
2. Lobby empty state + env gate.
3. Wallet callbacks with HMAC + idempotency + tests (bet, win, rollback, replay).
4. `launch` once sandbox URL exists.
5. Iframe page.
6. Seed `provider_games` from the official CSV, not from memory.
