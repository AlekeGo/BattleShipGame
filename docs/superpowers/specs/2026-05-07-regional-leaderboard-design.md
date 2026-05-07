# Regional Leaderboard — Design

**Date:** 2026-05-07  
**Tier:** T3 (polish)  
**Scope:** Wire the existing `regional_leaderboard` DB view to a backend endpoint and build a grouped frontend page.

---

## Goal

Show all players who have a region set, grouped by region, ranked by accuracy within each group. One page, no auth required, read-only.

---

## What Already Exists

- **DB view** `regional_leaderboard` — created in migration `0003_leaderboard_view.sql`, already applied. Columns: `region TEXT`, `display_name TEXT`, `wins BIGINT`, `total_games BIGINT`, `accuracy_pct NUMERIC`. Filters `WHERE g.status = 'finished' AND u.region IS NOT NULL`.
- **Backend router** mounted at `/api/leaderboard` in `main.py`. `leaderboard.py` is a stub returning 501.
- **Frontend page** `app/leaderboard/page.tsx` is a stub with "coming soon" text.

---

## Backend

**File:** `backend/app/api/leaderboard.py`

Single `GET /api/leaderboard` endpoint. Optional `?region=` query param to pre-filter at DB level (for future use, but not required by the frontend in this design).

Query the `regional_leaderboard` view via the Supabase client directly — no new repo class needed. Sort by `accuracy_pct DESC` at the DB level using `.order("accuracy_pct", desc=True)`.

Response shape:
```json
[
  { "region": "Almaty", "display_name": "Captain Nurma", "wins": 12, "total_games": 20, "accuracy_pct": 58.5 },
  ...
]
```

Error handling: if the DB call fails, return 500 with a standard `{"error": "..."}` body.

---

## Frontend

**File:** `frontend/src/app/leaderboard/page.tsx`

- `"use client"` component.
- On mount, `api.get<LeaderboardRow[]>("/api/leaderboard")`.
- Group rows by `region` client-side using a `Map<string, LeaderboardRow[]>`.
- Within each region group, rows are already sorted by `accuracy_pct DESC` from the backend.
- Render one `<section>` per region: region name as a header, then a table with columns: **Rank**, **Player**, **Wins**, **Games**, **Accuracy**.
- `display_name` falls back to `"Anonymous"` when null.
- Loading state: animate-pulse skeleton rows (matching stats page pattern).
- Error state: red error message.
- Empty state: "No ranked players yet. Play a game to appear here." with a link to `/play`.

---

## Data Flow

```
Browser → GET /api/leaderboard
         → FastAPI leaderboard.py
         → supabase.table("regional_leaderboard").select("*").order("accuracy_pct", desc=True)
         → returns JSON array
         → frontend groups by region
         → renders grouped sections
```

---

## What Is Not In Scope

- Region auto-detection (users get regions via `POST /api/users/{id}/region`, which already exists).
- Pagination (the view is small at hackathon scale).
- Real-time updates.
- Filtering UI on the page (all regions shown grouped).
