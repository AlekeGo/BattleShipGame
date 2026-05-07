# Profile Page — Design

**Date:** 2026-05-07  
**Tier:** T3 (polish, required to make leaderboard useful)  
**Scope:** Let users set their display name and region, and see a read-only stats summary.

---

## Goal

Give users a place to set `display_name` and `region` so they appear on the regional leaderboard with an identity. Also surfaces a quick stats summary so the page is useful beyond just settings.

---

## What Already Exists

- `users` table has `display_name TEXT`, `region TEXT`, `email TEXT` columns — no migration needed.
- `GET /api/users/{id}` — fetches current user record (implemented in `api/users.py`).
- `GET /api/users/{id}/stats` — returns win rate, accuracy, streak, total games (implemented in `api/stats.py`).
- `POST /api/users/{id}/region` — sets region only. Will be superseded by the new PATCH endpoint.
- `UsersRepo.set_region()` — exists, will be extended.

---

## Backend

**New method:** `UsersRepo.update_profile(user_id, display_name, region)` — single `.update()` call with whatever fields are provided (skip None values).

**New endpoint:** `PATCH /api/users/{id}/profile`  
- Body: `{ "display_name": string | null, "region": string | null }` (both optional)  
- Updates only the provided non-null fields.  
- Returns the updated user row.  
- No auth required (anonymous users can also set a name/region).

Request schema (new Pydantic model in `schemas/user.py`):
```python
class ProfileUpdate(BaseModel):
    display_name: str | None = None
    region: str | None = None
```

---

## Frontend

**New page:** `frontend/src/app/profile/page.tsx`

- `"use client"` component.
- On mount, fetch user record and stats in parallel:
  - `api.get<UserRecord>(\`/api/users/${uid}\`)`
  - `api.get<StatsData>(\`/api/users/${uid}/stats\`)`
- **Form section:**
  - Display name field: free text, max 50 chars, pre-filled from `user.display_name`.
  - Region field: free text, placeholder `"e.g. Almaty, KZ"`, pre-filled from `user.region`.
  - Save button: `PATCH /api/users/{id}/profile`. On success shows inline "Saved!" confirmation. On error shows inline red message.
- **Stats summary section** (below form, read-only):
  - Four `StatCard` components (Win rate, Accuracy, Win streak, Total games) — same component from stats page.
  - If `total_games === 0`, show "Play a game to see your stats" instead.
- Loading skeleton while both fetches resolve.
- Error state if either fetch fails.

**Nav link:** Add "Profile" link to `frontend/src/app/layout.tsx` nav alongside existing links.

---

## Data Flow

```
Browser → GET /api/users/{id}          → user record (name, region)
        → GET /api/users/{id}/stats    → stats summary
        (parallel)

Save → PATCH /api/users/{id}/profile   → { display_name, region }
     → UsersRepo.update_profile(...)
     → updated user row returned
```

---

## What Is Not In Scope

- Uploading an avatar or profile picture.
- Changing email or password (handled by Supabase Auth flows).
- Region dropdown/autocomplete — free text is sufficient for hackathon scale.
- Merging anonymous history into authenticated account on sign-in.
