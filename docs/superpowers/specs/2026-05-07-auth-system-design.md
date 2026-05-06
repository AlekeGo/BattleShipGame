# Auth System Design — Ocean Strike

**Date:** 2026-05-07  
**Status:** Approved

---

## Overview

Add Google OAuth and email/password authentication via Supabase Auth, with a soft gate: the game is still playable anonymously, but a persistent banner prompts unauthenticated users who have played at least one game to sign in to save their stats.

On sign-in, anonymous game history is discarded — the new account starts fresh.

---

## Identity Model

Two parallel tracks:

**Anonymous track** — unchanged from current system. `getOrCreateUserId()` creates a UUID via `POST /api/users/anon`, stored in `localStorage`. Used for all API calls when unauthenticated.

**Auth track** — Supabase Auth session. When signed in, the frontend uses `session.user.id` (Supabase's UUID) as `user_id`. On first sign-in, the backend upserts a row in `users` keyed to `auth.users.id`.

The `users` table gains one column: `auth_id UUID UNIQUE`, linking to Supabase's internal `auth.users`. Anonymous rows have `auth_id = NULL`. Authenticated rows have `auth_id = auth.user.id`, and `id = auth.user.id` for simplicity.

---

## Database Migration

```sql
-- migration 0004_auth.sql
ALTER TABLE users ADD COLUMN auth_id UUID UNIQUE;
```

---

## Backend

### `app/auth.py`

Token verification using Supabase's `auth.get_user(token)` — no manual JWT parsing. Stays correct across key rotations.

```python
async def verify_token(token: str) -> dict:
    response = supabase.auth.get_user(token)
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return response.user
```

### `app/deps.py` — updated

New dependency `get_auth_user`:
- If `Authorization` header absent → returns `None` (anonymous flow continues)
- If present → calls `verify_token()` → returns Supabase user
- If token invalid → raises `401`

On first authenticated request, upserts into `users`:
```sql
INSERT INTO users (id, email, auth_id)
VALUES (:id, :email, :auth_id)
ON CONFLICT (auth_id) DO NOTHING
```

### Route handlers

Existing handlers receive `auth_user = Depends(get_auth_user)`. If `auth_user` is present, it takes priority over any anonymous `user_id` in the request body.

---

## Frontend

### New packages

- `@supabase/supabase-js`
- `@supabase/ssr`

### `lib/supabase.ts`

Browser client singleton using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### `lib/user.ts` — updated

```ts
export async function getOrCreateUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;
  // fall back to existing anonymous UUID flow
  ...
}
```

### `hooks/useAuth.ts`

Wraps `supabase.auth.getSession()` + `onAuthStateChange`. Returns `{ user, loading, signOut }`.

### `/login` page

Two tabs: **Sign In** and **Sign Up**.

- Email + password fields + submit button
- "Continue with Google" button
- Google triggers `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`
- Email/password triggers `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`
- On success → redirect to `/play`
- No forgot-password flow in this version

### `/auth/callback/route.ts`

Next.js route handler that exchanges the OAuth `code` for a session via `supabase.auth.exchangeCodeForSession()`, then redirects to `/play`.

### `components/AuthBanner.tsx`

Persistent banner shown in layout when:
- User is not signed in, AND
- User has at least 1 game in localStorage (checked via `localStorage.getItem('bsc_user_id')` being set)

Content: `"Sign in to save your stats"` + link to `/login`.

### `components/NavUser.tsx`

Shown in nav when signed in: user's email (truncated) + "Sign out" button that calls `supabase.auth.signOut()`.

---

## Data Flow

```
Anonymous:
  Frontend → POST /api/games { user_id: "anon-uuid" }
  Backend  → no auth header → uses user_id from body

Authenticated:
  Frontend → POST /api/games { user_id: "auth-uuid" }
             Authorization: Bearer <supabase-jwt>
  Backend  → verifies JWT → upserts user row → uses auth user.id

Sign-in (Google):
  /login → signInWithOAuth() → Google → /auth/callback → session → /play

Sign-in (email):
  /login → signInWithPassword() → session set in browser → /play

Sign-out:
  signOut() → session cleared → user reverts to anonymous UUID
```

---

## New Files

| Path | Purpose |
|---|---|
| `frontend/src/lib/supabase.ts` | Browser Supabase client |
| `frontend/src/hooks/useAuth.ts` | Auth session state hook |
| `frontend/src/app/login/page.tsx` | Login/signup page |
| `frontend/src/app/auth/callback/route.ts` | OAuth code exchange handler |
| `frontend/src/components/AuthBanner.tsx` | Soft gate banner |
| `frontend/src/components/NavUser.tsx` | Nav user pill + sign-out |
| `backend/app/auth.py` | JWT verification via Supabase |
| `backend/migrations/0004_auth.sql` | Adds `auth_id` column to `users` |

## Modified Files

| Path | Change |
|---|---|
| `frontend/src/lib/user.ts` | Check Supabase session before anonymous UUID |
| `frontend/src/app/layout.tsx` | Add `AuthBanner` and `NavUser` |
| `backend/app/deps.py` | Add `get_auth_user` dependency |
| `backend/app/api/users.py` | Inject `get_auth_user`, handle upsert |
| `frontend/package.json` | Add `@supabase/supabase-js`, `@supabase/ssr` |

---

## Environment Variables

```
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# backend/.env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...   # service role key for auth.get_user()
```

---

## Out of Scope

- Forgot password / email reset
- Account merging (anonymous history → auth account)
- Email verification requirement
- Session refresh middleware (Supabase JS SDK handles this automatically)
