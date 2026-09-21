# PvP floor — Katika 21 + Four + Ludo

Supersedes Clash *lanes* in `ECONOMY_SPEC.md` §5–6 for the card sport.
Club games in `CLUB_SPEC.md` stay, but they live under **PvP**, not a separate Club nav.

Owner 2026-09-21: Clash is unfamiliar. Rebuild as **P2P closest-to-21**. Merge Clash + Club → **PvP**. House tables stay player vs house.

---

## 0. Product split

| Floor | Games | Opponent | Stats |
| --- | --- | --- | --- |
| **House** | dice, coinflip, mines, roulette | the book | never |
| **PvP** | **21**, Connect Four, Ludo Quick | another player | **21 only** |

Nav: House | PvP | (Casino later).
Routes: `/pvp`, `/pvp/21/:id`, `/pvp/four/:id`, `/pvp/ludo/:id`.
Old `/clash` and `/club` redirect here.

Money for all PvP: same escrow, 4% rake, maxWager 50/75, bought-first debit, `V += stake`, PHY stamina shared. See `ECONOMY_SPEC.md` §1 and `CLUB_SPEC.md` §1.

---

## 1. Why 21, not lanes

Everyone already knows “don’t go past 21.” Lanes were a new sport. Keep the deck honest. Stats unlock **optional BJ actions**, they do not change pip values.

Forbidden: +1 to hand total, extra ace, stacked shoe, peek at opponent hole as a hidden EV hack that replaces the deal.

---

## 2. Katika 21 — table rules (familiar)

Name in UI: **21**. Subtitle: “Closest to 21. Bust loses.”

- 52-card shoe, shuffled server-side per match (`crypto` shuffle). One shoe is enough for a 2-player hand.
- Values: 2–10 face, JQK = 10, A = 1 or 11 (best legal total).
- Each player: **2 cards** — 1 up, 1 hole. Spectator and opponent see only the up card until resolve.
- No dealer. No insurance. No 3:2 blackjack side bet. Natural 21 on first two is just 21 (still beats 20).
- Actions: **Hit** or **Stand**. Plus stat-gated **Double** / **Split** / **Glance** (§3).
- Simultaneous first action window after deal. Then if both hit, deal one each, repeat. If one stands, the other may keep hitting until stand or bust.
- Clock from PAC (§3). Timeout = **Stand** (not auto-hit).
- Resolve:
  - One ≤21, one bust → valid wins
  - Both ≤21 → higher total wins
  - Equal totals → **push** (refund both, rake 0)
  - Both bust → **push** (do not play “least over”; that surprises people)
- Split creates two hands vs the opponent’s one hand: each split hand resolves separately; net stake: extra stake frozen on split (must have playable). If they cannot pay the extra stake, split is illegal.
- Double: one extra card only, then stand. Extra stake = current hand stake, frozen now.

Winner payout: pot of frozen stakes − 4% rake. Push: full refund, `V += original stake` each (they played), slot burned.

Need a saved legend to sit.

---

## 3. How the six stats plug in

Stats never touch the shuffle. They gate **which extra button you have** and **tempo / soak / volume**.

Compare **your stat vs theirs**. Strictly higher → you may use that action this match. Tie → neither gets the extra (base Hit/Stand only for that button).

| Stat | If you are strictly higher | If you are not |
| --- | --- | --- |
| **PAC** | Opponent clock `clamp(12000 - 80*(yourPAC-50), 4000, 15000)` ms per action | You use 12s |
| **SHO** | **Double** allowed on first two cards of a hand | No double |
| **PAS** | **Split** allowed if the two cards are a pair (10/J/Q/K count as pair tens) | No split |
| **DRI** | **Glance** once: see the next shoe card privately, then you must Hit or Stand as usual (you do not have to take it; it stays next). Opponent does not see it | No glance |
| **DEF** | On a *loss*, pay half stake (soak). Same math as old Clash | Pay full |
| **PHY** | Daily PvP slots `5 + clamp(floor((phy-40)/20),0,3)` shared with Four/Ludo | Same formula |

Why this creates a card puzzle at cap 333:

- 99 SHO = you can double into fat pots, but you lose split / glance / soak / clock if they stacked those.
- 99 DEF = cheap deaths, never press.
- 99 PAS = pair monster, dead on 20 vs 11 if you cannot double.
- 99 DRI = information, no extra money on the table.
- 99 PAC = they panic-stand.
- 99 PHY = more matches, weaker buttons.

Base game is always playable with Hit/Stand. A 55/55/55/55/55/58 card is a complete 21 player. Specials are spice, not a new sport.

UI: after deal, show only the extra buttons you *won* the stat contest for. Grey the others with “Their SHO 82 > yours 61”. Teaching moment.

---

## 4. Flow

```
POST /api/pvp { game: "21" | "four" | "ludo", stake, mode }
POST /api/pvp/:id/accept
POST /api/pvp/:id/act     // 21: hit|stand|double|split|glance
GET  /api/pvp/:id
```

21 `board` json:

```
{
  "shoe": ["AH","2C", ...],   // remaining, server only — never send full shoe to client
  "up": { "me": "KS", "opp": "7D" },
  "holeKnown": false,         // true after resolve
  "hand": ["KS","5H"],        // own cards only on GET for that user
  "oppCount": 2,
  "extras": { "double": true, "split": false, "glance": true },
  "phase": "act" | "opp" | "done"
}
```

Never send opponent hole or remaining shoe to the client.

Four and Ludo: keep `CLUB_SPEC.md` rules; change prefix `club` → `pvp` in routes/tables or alias.

---

## 5. Build order

1. Rename nav to House / PvP. Redirect /club /clash.
2. 21 deal + hit/stand + resolve + tests (bust, push, 21 vs 20).
3. Wire SHO double, PAS split, DRI glance, PAC clock, DEF soak.
4. Four next (already specified).
5. Ludo Quick last.

Do not implement old Clash lanes.

---

## 6. Fairness copy

`/fair`: “House games are player vs the book. 21 / Four / Ludo are player vs player. 21 uses a shuffled 52-card shoe on the server. Card stats change optional actions (double, split, glance, clock, soak), not pip values.”
