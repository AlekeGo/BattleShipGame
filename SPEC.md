# Battleship Coach — Technical Specification

> "The only Battleship that makes you better at Battleship."
>
> 24-hour MVP for the nFactorial Incubator application.

---

## 1. Product Vision

**Problem.** Every Battleship platform on the market is a museum piece: ad-ridden mobile apps, no learning loop, and AI bots that are either trivially predictable or suspiciously perfect. Players play, lose, and never understand *why*.

**Solution.** A web-native Battleship that uses an LLM-powered Coach to analyze the player's behavioral patterns (shot entropy, parity discipline, post-hit follow-through, placement tendencies) after each game and tells them — in plain language — how to play better. Like Chess.com's game review, but for Battleship, and built around behavior rather than just move quality.

**Why this wins for nFactorial.** It is the only product on the market that treats Battleship as a learnable skill rather than a one-shot pastime. The technical moat (behavioral feature pipeline + LLM coaching) is non-trivial and reuses a proven pattern from Blunder Therapist, but the product framing is what an incubator scores.

**Target user.** Casual players who already know Battleship and feel like their losses are random. They want to improve but no product on the market helps them.

---

## 2. Scope (24-hour MVP)

The scope is structured in tiers. Tier 0 and Tier 1 are non-negotiable — without them there is no product. Tier 2 and Tier 3 are dropped one-by-one if time runs out.

### Tier 0 — Core game (must have, ~6h)
- 10×10 board, classic ruleset (1×Carrier-5, 1×Battleship-4, 1×Cruiser-3, 1×Submarine-3, 1×Destroyer-2)
- Manual ship placement with drag-rotate, plus "Auto-place" button
- Server-side validation (no overlaps, no out-of-bounds, correct fleet composition)
- Turn-based play vs. AI bot, with hit / miss / sunk / win-loss states
- 3 difficulty levels for the bot:
  - **Easy** = pure random shooting
  - **Medium** = Hunt mode (random until hit, then probe adjacent cells)
  - **Hard** = Probabilistic targeting (parity + Bayesian probability map over remaining ship configurations)
- Hot-seat 2-player mode on one device (reuses the same game engine, no extra logic needed)
- Responsive UI (desktop + mobile)

### Tier 1 — AI Coach (must have, ~4-5h) — **the differentiator**
- After each game, backend extracts behavioral features from the move log
- LangChain + OpenAI `gpt-4o-mini` chain produces a structured analysis with:
  - **Player archetype** (one of: Random Shooter, Aggressive Hunter, Methodical Planner, Defensive Placer, Pattern-Locked)
  - **Top mistake** of the game (one specific, actionable observation)
  - **3 concrete tips** for next game, tied to the player's actual moves
  - **One thing they did well** (positive reinforcement matters)
- Coach report renders as a polished post-game screen, not a wall of text

### Tier 2 — Persistence & Stats (~3h)
- Anonymous user identity via Supabase (auto-generated `user_id` stored in `localStorage`, no login required)
- Optional: upgrade to magic-link email auth to sync across devices
- Save every finished game: moves, result, AI analysis
- "My Stats" page: win rate, accuracy %, archetype evolution over last 10 games, streak
- Game history with replay (click a past game → see board + AI analysis again)

### Tier 3 — Polish & social signal (~2-3h, drop first if behind)
- Regional leaderboard ("Top players from Almaty by accuracy") — single Postgres view + page
- Light/dark theme toggle
- "Upgrade to Pro" modal (non-functional) — shows skin previews + waitlist form. This is a **product signal** for nFactorial, not a real feature
- Landing page on `/` explaining the product before play

### Out of scope (explicitly cut)
- Real-time online multiplayer (WebSockets) — too risky in 24h, goes into roadmap
- Stripe / real payments
- Friends, chat, party invites
- Native mobile app
- Tournaments

---

## 3. Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Solid defaults, easy Vercel deploy |
| UI | Tailwind CSS + shadcn/ui | No time to design components from scratch |
| State | React `useState` / `useReducer` | No Redux/Zustand needed at this scale |
| Backend | FastAPI (Python 3.11) | Your strength, async-friendly |
| LLM | LangChain + OpenAI `gpt-4o-mini` | Cheap, fast, good at structured output |
| DB | Supabase Postgres | Auth + DB + RLS in one |
| Hosting (FE) | Vercel | One-click Next.js deploy |
| Hosting (BE) | Railway or Render | Free tier, Python-friendly |
| Package mgmt | `uv` for Python, `pnpm` for Next.js | Fast |

---

## 4. Architecture

```
┌─────────────────┐      HTTPS / JSON     ┌─────────────────┐
│   Next.js UI    │ ────────────────────> │     FastAPI     │
│   (Vercel)      │ <──────────────────── │  (Railway)      │
└─────────────────┘                       └────────┬────────┘
                                                   │
                                       ┌───────────┼───────────┐
                                       │           │           │
                                  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
                                  │Supabase │ │ OpenAI  │ │ Game    │
                                  │  (PG)   │ │ (LLM)   │ │ Engine  │
                                  └─────────┘ └─────────┘ └─────────┘
```

**Key design decisions:**

1. **Server-authoritative game state.** All ship positions and hit logic live on the backend. The frontend never knows where the bot's ships are. This prevents the "AI cheating" perception problem from competitor analysis — the bot literally cannot peek.
2. **Stateless AI bot logic.** Bot moves are computed per-request from game state in the DB. No in-memory game sessions to lose on backend restart.
3. **LLM only for post-game coaching.** Bot AI is pure Python (numpy probability map). LLM is expensive and slow — keep it off the hot path.
4. **Anonymous-first auth.** New visitor → backend creates a UUID user, returns it, frontend stores in `localStorage`. No login wall. Optional magic-link upgrade later.

---

## 5. Database Schema (Supabase Postgres)

```sql
-- Users (anonymous by default, optional email upgrade)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- nullable, set on magic-link upgrade
  display_name TEXT,                    -- e.g. "Captain Almaty"
  region TEXT,                          -- inferred from IP, e.g. "Almaty, KZ"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL,                   -- 'pvbot_easy' | 'pvbot_medium' | 'pvbot_hard' | 'hotseat'
  player_board JSONB NOT NULL,          -- { ships: [...], shots_received: [...] }
  bot_board JSONB,                      -- nullable for hotseat
  moves JSONB NOT NULL DEFAULT '[]',    -- [{turn, by, coord, result, ts}, ...]
  status TEXT NOT NULL,                 -- 'placing' | 'active' | 'finished'
  winner TEXT,                          -- 'player' | 'bot' | 'p1' | 'p2'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- AI Coach analyses (one per finished game)
CREATE TABLE analyses (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  features JSONB NOT NULL,              -- extracted behavioral features
  archetype TEXT NOT NULL,              -- LLM output
  top_mistake TEXT NOT NULL,
  tips JSONB NOT NULL,                  -- array of 3 strings
  did_well TEXT NOT NULL,
  llm_raw JSONB,                        -- full LLM response for debugging
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard view (Tier 3)
CREATE VIEW regional_leaderboard AS
SELECT
  u.region,
  u.display_name,
  COUNT(g.id) FILTER (WHERE g.winner = 'player') AS wins,
  COUNT(g.id) AS total_games,
  ROUND(
    100.0 * SUM(jsonb_array_length(g.moves) FILTER (WHERE g.winner = 'player'))
    / NULLIF(SUM(jsonb_array_length(g.moves)), 0),
    2
  ) AS accuracy_pct
FROM users u
JOIN games g ON g.user_id = u.id
WHERE g.status = 'finished' AND u.region IS NOT NULL
GROUP BY u.region, u.display_name;
```

**Indexes:**
```sql
CREATE INDEX idx_games_user ON games(user_id, ended_at DESC);
CREATE INDEX idx_games_region ON games(user_id) WHERE status = 'finished';
```

---

## 6. API Contract (FastAPI)

All endpoints return JSON. All error responses use `{ "error": "...", "code": "..." }`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/users/anon` | Create anonymous user, return `{ user_id }` |
| POST | `/api/users/{id}/region` | Set region (auto-called from FE with IP geo or manual) |
| POST | `/api/games` | Create new game with `{ user_id, mode }` → returns `{ game_id, ship_fleet }` |
| POST | `/api/games/{id}/place` | Submit ship placement `{ ships: [...] }` → validates, sets `status=active` |
| POST | `/api/games/{id}/place-auto` | Server auto-places ships, returns positions |
| POST | `/api/games/{id}/shoot` | Player shot `{ coord }` → returns `{ result, sunk?, bot_move?, game_over?, winner? }` |
| GET | `/api/games/{id}` | Fetch full game state |
| POST | `/api/games/{id}/analyze` | Trigger AI Coach (called automatically on game end) → returns full analysis |
| GET | `/api/users/{id}/stats` | Win rate, accuracy, recent archetypes |
| GET | `/api/users/{id}/games` | Paginated history (latest 20) |
| GET | `/api/leaderboard?region=Almaty` | Tier 3 |

**Critical:** `/shoot` returns *both* the player's hit result AND the bot's response move in one round-trip. This makes the UI feel snappy.

---

## 7. Game Engine (Python module)

`engine/` directory, fully unit-testable, no FastAPI/DB dependencies.

```
engine/
├── board.py           # Board class: place_ship, receive_shot, is_sunk, is_lost
├── fleet.py           # Ship definitions, validation
├── bots/
│   ├── base.py        # Bot interface: choose_shot(state) -> (row, col)
│   ├── random_bot.py  # Easy
│   ├── hunt_bot.py    # Medium: random → adjacent on hit
│   └── prob_bot.py    # Hard: parity + probability density map
└── features.py        # Extract behavioral features from move log
```

**Hard bot algorithm (probability map):**

For every cell, count how many possible placements of remaining ships would cover it, given the constraints (known hits, misses, sinks). Shoot the highest-probability cell. Apply parity (only even-parity cells in hunt phase) until first hit, then switch to targeting adjacent cells.

This is the algorithm from the DataGenetics blog — completes 50% of games in ~42 turns. Strong enough to feel challenging, weak enough that good players still win.

---

## 8. Behavioral Features (the heart of the Coach)

Extracted from the player's move log after the game ends. All are computed in `engine/features.py`, no LLM involvement.

| Feature | Computation | What it tells the Coach |
|---|---|---|
| `total_shots` | Total player shots fired | Game length |
| `accuracy_pct` | hits / total_shots | Overall skill proxy |
| `parity_adherence` | % of hunt-phase shots on parity cells | Strategic discipline |
| `post_hit_followthrough` | After a hit, % of next 4 shots that were adjacent | Targeting efficiency |
| `shot_entropy` | Shannon entropy of shot distribution across quadrants | Random vs. systematic |
| `wasted_shots_after_sink` | Shots into already-cleared zones around sunk ships | Tracking discipline |
| `placement_corners` | How many of player's ships touched corners | Predictability |
| `placement_edges` | How many of player's ships were edge-aligned | Predictability |
| `avg_time_per_shot` | Mean ms between shots (if logged) | Rushing vs. thinking |
| `bot_difficulty` | Easy/Medium/Hard | Calibration |
| `outcome` | Won / Lost in N turns | Result |

These features are passed to the LLM as a JSON blob. The LLM does not see raw move coordinates — it sees the *patterns*.

---

## 9. AI Coach Prompt (LangChain)

```python
SYSTEM_PROMPT = """
You are Battleship Coach, an expert Battleship strategy analyst. You analyze
a player's behavioral patterns from a single game and give them honest,
specific, actionable feedback.

Your output is structured JSON matching this schema:
- archetype: one of [Random Shooter, Aggressive Hunter, Methodical Planner,
  Defensive Placer, Pattern-Locked]
- top_mistake: one sentence naming the single biggest issue, citing a
  concrete number from the features
- tips: exactly 3 specific tips for next game, each one sentence
- did_well: one sentence on what they did well (always find something)

Tone: like a chess coach who respects the player. Direct, not condescending.
No fluff. No "great job!" unless they actually played well.
"""

USER_TEMPLATE = """
Game features:
{features_json}

Game outcome: {outcome}
Bot difficulty: {bot_difficulty}

Analyze and respond in the required JSON format.
"""
```

LangChain chain uses `with_structured_output(CoachAnalysis)` where `CoachAnalysis` is a Pydantic model. This guarantees parseable output without regex hacks.

---

## 10. Frontend Structure (Next.js App Router)

```
app/
├── page.tsx                  # Landing page (Tier 3)
├── play/page.tsx             # Game setup + active game
├── game/[id]/page.tsx        # Active game view
├── game/[id]/review/page.tsx # Post-game AI Coach screen
├── stats/page.tsx            # User's stats (Tier 2)
├── history/page.tsx          # Past games (Tier 2)
├── leaderboard/page.tsx      # Tier 3
└── components/
    ├── Board.tsx             # 10x10 grid, fires onClick(coord)
    ├── ShipPlacer.tsx        # Drag-place ships
    ├── CoachReport.tsx       # Pretty render of analysis JSON
    └── UpgradeModal.tsx      # Tier 3, "Pro" coming-soon
```

**Hot-seat handling.** Same `Board` component, two of them, with a "pass device" overlay between turns to hide ships. Built on top of the existing PvBot flow.

---

## 11. 24-Hour Build Plan

This is the order to build in. It's structured so you can stop at any boundary and still have a working product.

| Hour | Task | Tier |
|---|---|---|
| 0–1 | Repo setup, FastAPI skeleton, Next.js skeleton, Supabase project, env vars, deploy both to verify CI/CD works **before** writing logic | — |
| 1–4 | Game engine: Board, Fleet, validation, Random bot. Unit tests. | T0 |
| 4–6 | API endpoints: create game, place ships, shoot. Test with curl. | T0 |
| 6–9 | Frontend: board grid, ship placer, shoot interaction. Connect to API. **First playable build.** | T0 |
| 9–10 | Hunt bot + Probability bot | T0 |
| 10–13 | Behavioral feature extraction + LangChain Coach chain. Test with synthetic games. | T1 |
| 13–14 | Coach report UI screen | T1 |
| 14–15 | **Sleep / break (mandatory).** | — |
| 15–17 | Supabase persistence: save games, anonymous user flow | T2 |
| 17–18 | Stats page + history page | T2 |
| 18–20 | Leaderboard view + page, dark mode toggle | T3 |
| 20–21 | "Upgrade to Pro" modal, landing page | T3 |
| 21–22 | README with product story, screenshots, roadmap | — |
| 22–23 | Loom demo video (2 min) | — |
| 23–24 | Buffer / submit form | — |

**Drop order if behind schedule:** leaderboard → dark mode → upgrade modal → landing page → history page → stats page. Coach is never dropped.

---

## 12. Deliverables (for nFactorial submission)

1. **Live deployed URL** (Vercel for FE, Railway for BE)
2. **GitHub repository** with:
   - This SPEC.md
   - README.md with product story (problem → competitive analysis summary → solution → roadmap)
   - Working `docker-compose.yml` for local dev (nice to have)
   - Clean commit history (don't squash everything into one commit)
3. **Loom demo (2 min)**: play one game end-to-end, show Coach report, show stats, mention roadmap
4. **README highlights:**
   - "Why this exists" — 1 paragraph problem statement
   - "What's different" — 3 bullets vs competitors (no ads, AI Coach, stat-driven progression)
   - Product roadmap (multiplayer, Pro tier, school tournaments) — shows vision
   - Clear setup instructions

---

## 13. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| OpenAI API outage during build | Low | Cache one synthetic Coach response; demo can show that |
| Supabase free-tier quota | Low | Quota is generous; monitor in Tier 2 |
| Probability bot too hard to implement | Medium | Ship the Hunt bot as "Hard" and label it; add prob bot post-deadline |
| Vercel/Railway deploy issues at hour 23 | Medium | Deploy at hour 0 with hello-world. Never deploy first time at the end. |
| Burnout / sleep deprivation breaking debug | High | Mandatory 1h sleep window at hour 14. Non-negotiable. |
| Hot-seat mode adds complexity | Low | Skip if Tier 0 runs over 6h |

---

## 14. Post-Hackathon Roadmap (for the README)

To show product vision without coding it:

- **Multiplayer-by-link** (WebSocket rooms, share URL)
- **3-Minute Blitz** mode with shot timer
- **Pro tier**: custom ship skins, animated explosions, deep analytics dashboard
- **School Tournament mode**: bulk player registration, bracket UI, teacher dashboard
- **Coach Pro**: per-move analysis (not just post-game), opening repertoire suggestions
- **Friends & private rooms**

---

## 15. Success Criteria

The MVP is successful for nFactorial submission if:

- A new visitor can play a full game vs. a bot in under 90 seconds from landing on the URL
- The Coach report after a game contains specific references to the player's actual moves (not generic advice)
- The README clearly explains why this is not "another Battleship clone"
- Tier 0 + Tier 1 are 100% working; Tier 2 and Tier 3 are bonus

If you have all of the above by the deadline, the build is a win regardless of polish.