# Club — Connect Four + Ludo Quick

For the implementing AI. Read `HANDOVER.md` then `ECONOMY_SPEC.md` first.
This file is a **third floor**. It uses Clash *money*. It does **not** use Clash *lanes*.

Repo: `iHulkXil/Katika`.
API: Render. Web: Vercel. Auth: Privy. Unit: **KTK**.

---

## 0. Invariants

1. Club games **ignore** PAC SHO PAS DRI DEF PHY. Card is a jersey + nameplate only.
2. Same wallets as economy spec: debit bought first, wins to bought, volume `V += stake` each player.
3. Same caps: `1 <= stake <= maxWager` (50, or 75 if `stake_plus`).
4. Same rake: **4% of pot** after a result. Abort / expire / decline → **0 rake**, full refund.
5. Need a saved legend (`profileComplete`) to sit at a Club table. Same as Clash.
6. PHY stamina: Club games **share Clash daily slots** unless you already split `board_slots`. Default: share. Reject with `no_stamina`.
7. No house bank. No bots in v1. No 3–4 player Ludo in v1.
8. Server is source of truth. Client never resolves a win.
9. Build **Connect Four** to production quality before starting Ludo UI.
10. Do not fold Club rows into `clashes`. New `club_matches` table.

---

## 1. Shared match machine

States: `open` → `live` → `resolved` | `aborted` | `expired`

```
POST /api/club { game: "four" | "ludo", stake, mode: "challenge" | "queue" }
POST /api/club/:id/accept
POST /api/club/:id/move   { ...game specific }
POST /api/club/:id/abort  // only before first live move, or both agree
GET  /api/club/:id
GET  /api/club/recent     // last 10 resolved, any club game
```

Create freezes creator stake immediately.
Accept freezes opponent stake → `live`.
Unmatched 10 minutes → `expired`, refund creator, `V += 0`, no slot.

Abort:
- Before any legal move committed: either player, refund both, no slot.
- After first move: only if **both** post abort within 30s of each other. Else play on or flag (see clocks).

Disconnect:
- 60s reconnect window (`last_seen`).
- Then treat as timeout on *their* clock, not instant forfeit at disconnect.

Clocks:
- Four: **15s** per drop. Timeout → auto-drop in the **leftmost valid column**. If none (board full), draw.
- Ludo: **20s** per action (roll or move). Timeout → if they must move, auto-move the token that *can* move and is furthest from home; if only roll pending, auto-roll (server RNG) then auto-move that same rule.

Rematch:
`POST /api/club/:id/rematch` creates a **new** match with same game + stake, both must accept. Old id stays resolved.

Share path: `/club/four/:id` and `/club/ludo/:id`.

Payout on `resolved` with a winner:

```
pot = 2 * stake
rake = floor(pot * 0.04)
prize = pot - rake
```

Draw (Four board full, no 4-in-a-row): refund both stakes, rake 0, `V += stake` each (they played), slot burned.

---

## 2. Connect Four (`game = "four"`)

### Rules (freeze)

- Grid **7 columns × 6 rows**.
- Creator is Red, plays first.
- Drop a token in a column; it falls to the lowest empty cell.
- Win: four own tokens in a row, column, or either diagonal.
- Board full + no four → draw.

### Board encoding

`board` is 42 cells, row-major, row 0 = **bottom** (gravity).

```
0 empty | 1 red | 2 yellow
board[row * 7 + col]
```

`moves` array: list of columns 0–6 in order played. Replay from empty to audit.

### Move payload

```
POST /api/club/:id/move { col: 0-6 }
```

Reject if not your turn, column full, not `live`.
After apply: if win → resolve; if full → draw; else switch turn.

### Server helpers (unit-test these)

```
legalCols(board) -> number[]
applyDrop(board, col, color) -> board | error
winner(board) -> 0 | 1 | 2     // 0 none
isFull(board) -> boolean
```

Win scan: from the cell just dropped, walk ± in N,S,E,W,NE,NW,SE,SW and count. Need 4 including origin.

### UI

- Mobile first. Columns are fat tap targets, not a tiny canvas only.
- Highlight winning four.
- Show both legend names + tiny card face, not stats sliders.
- Rematch + Copy link after resolve.
- Colour: keep Katika dark casino, red/yellow discs, no pastel kids theme.

### Tests (minimum)

- Horizontal / vertical / both diagonals win on the dropping piece.
- Full-column reject.
- Out-of-turn reject.
- Timeout leftmost-valid.
- Draw on 42 fills.
- Abort before move refunds.
- Payout 50 vs 50 → rake 4, prize 96.

---

## 3. Ludo Quick (`game = "ludo"`)

**Not** classic 4-player Ludo King. If you build 4 tokens × 4 players you will miss the session-length target.

### Frozen ruleset name: `ludo_quick_v1`

- **2 players** only.
- **2 tokens** each (not 4).
- Board: standard Ludo *track length* 52 + home column 6.
- Need **6 to leave yard** (enter tile 0 of that colour’s start).
- Exact count to enter home. Overshoot = token stays, turn ends (no bounce).
- Capture: land on opponent on a **non-safe** tile → opponent token back to yard.
- Safe tiles: each colour start, and the four classic mid-side stars (define coordinates in code comments; freeze 8 safe indexes on the 52-ring).
- Block: two own tokens on same ring tile form a block. Opponent cannot land or pass that tile. Own tokens may stack (max 2 in v1).
- Extra turn on **6**, on **capture**, and on **token reaching home**. Cap **3 extra-turns in a row**; fourth 6 just moves then passes.
- Win: **both** tokens home.
- Dice: server `crypto.randomInt(1, 7)` only. Never client.

### Positions

Per player:

```
tokens: [{ pos: "yard" | "ring:0-51" | "home:1-6" | "done" }]
```

Ring 0 for Red is Red start. Yellow start is `+26 mod 52`.
Home column is entered only from that colour’s entry index (Red: the ring tile before its home mouth). Document those two mouth indexes in code.

### Turn payload (two-step)

State `await_roll` | `await_move`.

```
POST /api/club/:id/move { op: "roll" }
→ { die: 1-6, legal: TokenRef[] }

POST /api/club/:id/move { op: "move", token: 0 | 1 }
```

If `legal` is empty after a roll (all yard and not 6, or all overshoot): turn passes. Do not make the client invent a pass.

If exactly one legal token: still require the move post (or auto-move on timeout).

### Extra-turn bookkeeping

`extras_in_row` increments on 6 / capture / done-token. Reset when a turn ends without a bonus. At 3, next bonus is ignored.

### UI

- Top-down board, tokens as legend-coloured pips (use card kit colour if `kit_prime` else red/yellow).
- Big ROLL button. Legal tokens pulse. Illegal taps ignored.
- Die in the center, not a tiny corner.
- 2p only. No “waiting for 3 more friends.”
- Same rematch + link pattern as Four.

### Tests (minimum)

- 6 from yard enters start.
- Non-6 from yard is illegal.
- Exact home; overshoot stays.
- Capture on unsafe; no capture on safe.
- Block cannot be landed on by opponent.
- Three 6s then a fourth does not grant a fifth roll.
- Both tokens `done` → winner.
- RNG only on server.

---

## 4. Neon

```sql
CREATE TABLE IF NOT EXISTS club_matches (
  id text PRIMARY KEY,
  game text NOT NULL,              -- four | ludo
  ruleset text NOT NULL,           -- four_v1 | ludo_quick_v1
  creator_id text NOT NULL,
  opponent_id text,
  stake integer NOT NULL,
  mode text NOT NULL,
  state text NOT NULL,
  turn_user_id text,
  board jsonb NOT NULL DEFAULT '{}',
  winner_id text,
  rake integer,
  prize integer,
  last_seen_creator timestamptz,
  last_seen_opponent timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
```

`board` JSON examples:

Four: `{ "cells": number[42], "moves": number[] }`
Ludo: `{ "die": n, "phase": "await_roll"|"await_move", "extras": n, "red": [...], "yellow": [...] }`

Also write a `game_bets` (or equivalent) row per player on resolve/draw so rollover `V` stays one query. `game = 'club_four' | 'club_ludo'`.

Rake → same `house_rake` table as Clash, `clash_id` nullable, add `club_id` or a generic `source_id`.

---

## 5. Frontend routes

- `/club` lobby: two tiles (Four, Ludo Quick), stake via existing `WagerRow`, Challenge / Queue.
- `/club/four/:id`
- `/club/ludo/:id`
- Poll `GET /api/club/:id` every 1s while `live` (websocket later). Do not invent a socket in v1.

Nav: add **Club** next to Play. Do not bury under casino menu only.

---

## 6. Build order

1. `club_matches` + create/accept/expire/refund (no pieces yet).
2. Four rules + tests + `move`.
3. Four page + rematch + link.
4. Only then Ludo rules + tests.
5. Ludo page.
6. Recent club results on `/club` and optionally home.

Do not start Ludo art before Four has paid out a real pot on staging.

---

## 7. Out of scope

4-player Ludo, 4 tokens, computer opponent, chat, chess, pool physics, Uno licence, Clash lanes on the board, client-side dice, withdrawals.
