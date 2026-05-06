# Auth System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth and email/password auth via Supabase Auth, with a soft gate (anonymous play still works, a banner prompts sign-in after first game).

**Architecture:** Two identity tracks — anonymous UUID (existing, unchanged) and Supabase Auth session. `lib/user.ts` checks session first, falls back to anonymous UUID. Backend verifies JWTs on requests that include `Authorization: Bearer <token>`. On first authenticated request, backend upserts a `users` row keyed to `auth.users.id`.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr` (frontend); `supabase` Python SDK already installed (backend); Next.js 14 App Router route handlers for OAuth callback.

---

## Pre-Flight: Supabase Dashboard Setup

Before writing any code, do these two steps in the Supabase dashboard:

1. **Apply migration:** Go to SQL Editor → paste and run `backend/migrations/0004_auth.sql` (created in Task 1).
2. **Enable Google OAuth:** Go to Authentication → Providers → Google → toggle on. You'll need a Google Cloud OAuth app with:
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Copy the Client ID and Secret into Supabase.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/migrations/0004_auth.sql` | Create | Adds `auth_id` column to `users` |
| `backend/app/auth.py` | Create | `verify_token(token)` → Supabase user or 401 |
| `backend/app/db/repositories/users.py` | Modify | Add `upsert_auth_user(auth_id, email)` |
| `backend/app/deps.py` | Modify | Add `get_auth_user` dependency |
| `backend/app/api/users.py` | Modify | Implement `create_anon` stub; inject `get_auth_user` |
| `backend/tests/test_auth.py` | Create | Tests for `verify_token` |
| `backend/tests/test_deps.py` | Create | Tests for `get_auth_user` |
| `frontend/src/lib/supabase.ts` | Create | Browser Supabase client singleton |
| `frontend/src/hooks/useAuth.ts` | Create | Session state hook |
| `frontend/src/lib/user.ts` | Modify | Check session before anonymous UUID |
| `frontend/src/lib/api.ts` | Modify | Add `Authorization` header when session exists |
| `frontend/src/app/login/page.tsx` | Create | Sign-in / sign-up page |
| `frontend/src/app/auth/callback/route.ts` | Create | OAuth code exchange handler |
| `frontend/src/components/AuthBanner.tsx` | Create | Soft gate banner |
| `frontend/src/components/NavUser.tsx` | Create | Nav user pill + sign-out |
| `frontend/src/app/layout.tsx` | Modify | Add nav bar with `NavUser` and `AuthBanner` |
| `frontend/.env.example` | Modify | Add Supabase public env vars |

---

## Task 1: DB Migration

**Files:**
- Create: `backend/migrations/0004_auth.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- backend/migrations/0004_auth.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Log into your Supabase project → SQL Editor → paste the above → Run.
Expected: success with no error. Verify with: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users';` — `auth_id` should appear.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/0004_auth.sql
git commit -m "feat: add auth_id column to users"
```

---

## Task 2: Backend — `verify_token`

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_auth.py
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.auth import verify_token


async def test_verify_token_valid():
    mock_user = MagicMock()
    mock_user.id = "user-uuid-123"
    mock_response = MagicMock()
    mock_response.user = mock_user

    with patch("app.auth.get_supabase") as mock_get:
        mock_get.return_value.auth.get_user.return_value = mock_response
        user = await verify_token("valid-token")
        assert user.id == "user-uuid-123"
        mock_get.return_value.auth.get_user.assert_called_once_with("valid-token")


async def test_verify_token_invalid_raises_401():
    mock_response = MagicMock()
    mock_response.user = None

    with patch("app.auth.get_supabase") as mock_get:
        mock_get.return_value.auth.get_user.return_value = mock_response
        with pytest.raises(HTTPException) as exc_info:
            await verify_token("bad-token")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_auth.py -v
```

Expected: `ImportError` — `app.auth` does not exist yet.

- [ ] **Step 3: Implement `auth.py`**

```python
# backend/app/auth.py
from fastapi import HTTPException

from app.db.supabase import get_supabase


async def verify_token(token: str):
    response = get_supabase().auth.get_user(token)
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return response.user
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_auth.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth.py backend/tests/test_auth.py
git commit -m "feat: add JWT verification via Supabase auth.get_user"
```

---

## Task 3: Backend — `UsersRepo.upsert_auth_user`

**Files:**
- Modify: `backend/app/db/repositories/users.py`

The current file has `create_anon`, `set_region`, and `get`. Add one method.

- [ ] **Step 1: Write the failing test**

Add this to `backend/tests/test_auth.py` (extend the existing file):

```python
from unittest.mock import MagicMock, patch

from app.db.repositories.users import UsersRepo


async def test_upsert_auth_user_returns_row():
    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"}
    ]
    repo = UsersRepo(mock_db)
    result = await repo.upsert_auth_user("auth-uuid", "a@b.com")
    assert result["auth_id"] == "auth-uuid"
    assert result["email"] == "a@b.com"
    mock_db.table.assert_called_with("users")
    mock_db.table.return_value.upsert.assert_called_once_with(
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"},
        on_conflict="auth_id",
    )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_auth.py::test_upsert_auth_user_returns_row -v
```

Expected: `AttributeError` — `UsersRepo` has no `upsert_auth_user`.

- [ ] **Step 3: Add `upsert_auth_user` to `UsersRepo`**

Open `backend/app/db/repositories/users.py`. Add after `get`:

```python
    async def upsert_auth_user(self, auth_id: str, email: str) -> dict:
        data = {"id": auth_id, "auth_id": auth_id, "email": email}
        res = (
            self.db.table("users")
            .upsert(data, on_conflict="auth_id")
            .execute()
        )
        return res.data[0]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_auth.py::test_upsert_auth_user_returns_row -v
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/db/repositories/users.py backend/tests/test_auth.py
git commit -m "feat: add upsert_auth_user to UsersRepo"
```

---

## Task 4: Backend — `get_auth_user` dependency

**Files:**
- Modify: `backend/app/deps.py`
- Create: `backend/tests/test_deps.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_deps.py
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.deps import get_auth_user


async def test_get_auth_user_no_header_returns_none():
    result = await get_auth_user(authorization=None, db=MagicMock())
    assert result is None


async def test_get_auth_user_bad_format_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        await get_auth_user(authorization="Token abc", db=MagicMock())
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authorization header"


async def test_get_auth_user_valid_token_upserts_and_returns_user():
    mock_user = MagicMock()
    mock_user.id = "auth-uuid"
    mock_user.email = "a@b.com"

    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "auth-uuid", "auth_id": "auth-uuid", "email": "a@b.com"}
    ]

    with patch("app.deps.verify_token", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        result = await get_auth_user(authorization="Bearer valid-token", db=mock_db)

    mock_verify.assert_called_once_with("valid-token")
    assert result == mock_user
    # upsert was called
    mock_db.table.assert_called_with("users")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_deps.py -v
```

Expected: `ImportError` — `get_auth_user` does not exist in `deps.py`.

- [ ] **Step 3: Update `deps.py`**

Replace the full contents of `backend/app/deps.py`:

```python
from fastapi import Depends, Header, HTTPException
from supabase import Client

from app.auth import verify_token
from app.db.supabase import get_supabase
from app.db.repositories.users import UsersRepo
from app.db.repositories.games import GamesRepo

__all__ = ["get_supabase", "get_users_repo", "get_games_repo", "get_auth_user"]


def get_users_repo(db: Client = Depends(get_supabase)) -> UsersRepo:
    return UsersRepo(db)


def get_games_repo(db: Client = Depends(get_supabase)) -> GamesRepo:
    return GamesRepo(db)


async def get_auth_user(
    authorization: str | None = Header(default=None),
    db: Client = Depends(get_supabase),
):
    if authorization is None:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    user = await verify_token(token)
    await UsersRepo(db).upsert_auth_user(str(user.id), user.email or "")
    return user
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_deps.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/deps.py backend/tests/test_deps.py
git commit -m "feat: add get_auth_user FastAPI dependency"
```

---

## Task 5: Backend — implement `users.py` stubs

**Files:**
- Modify: `backend/app/api/users.py`

The two route handlers currently raise `NotImplementedError`. Wire them to the repo.

- [ ] **Step 1: Write a smoke test**

```python
# backend/tests/test_api_users.py  (create new file)
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_create_anon_user_returns_user_id():
    mock_repo = MagicMock()
    mock_repo.create_anon = AsyncMock(return_value={"id": "anon-uuid-123"})

    with patch("app.api.users.get_users_repo", return_value=mock_repo):
        client = TestClient(app)
        response = client.post("/api/users/anon")

    assert response.status_code == 200
    assert response.json() == {"user_id": "anon-uuid-123"}
```

- [ ] **Step 2: Run to verify it fails**

```bash
uv run pytest tests/test_api_users.py::test_create_anon_user_returns_user_id -v
```

Expected: 500 or error — handler raises `NotImplementedError`.

- [ ] **Step 3: Implement the handlers**

Replace full contents of `backend/app/api/users.py`:

```python
from fastapi import APIRouter, Depends

from app.db.repositories.users import UsersRepo
from app.deps import get_users_repo
from app.schemas.user import RegionUpdate, UserCreated

router = APIRouter()


@router.post("/anon", response_model=UserCreated)
async def create_anon_user(repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.create_anon()
    return UserCreated(user_id=user["id"])


@router.post("/{user_id}/region")
async def set_region(
    user_id: str,
    payload: RegionUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    await repo.set_region(user_id, payload.region)
    return {"ok": True}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_api_users.py::test_create_anon_user_returns_user_id -v
```

Expected: 1 passed.

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
uv run pytest -v
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/users.py backend/tests/test_api_users.py
git commit -m "feat: implement create_anon and set_region user endpoints"
```

---

## Task 6: Frontend — Supabase client + env vars

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Install packages**

```bash
cd frontend && pnpm add @supabase/supabase-js @supabase/ssr
```

Expected: packages added to `package.json`, no peer-dep warnings.

- [ ] **Step 2: Update `.env.example`**

Open `frontend/.env.example` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Also copy these two lines into your local `frontend/.env.local` (create it if it doesn't exist) and fill in real values from your Supabase project → Settings → API.

- [ ] **Step 3: Create `lib/supabase.ts`**

```typescript
// frontend/src/lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/.env.example frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat: add Supabase browser client"
```

---

## Task 7: Frontend — `useAuth` hook

**Files:**
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useAuth.ts
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
  }

  return { user, loading, signOut };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook for Supabase session state"
```

---

## Task 8: Frontend — update `api.ts` and `user.ts`

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/user.ts`

`api.ts` needs to attach `Authorization: Bearer <token>` when a session exists. `user.ts` needs to return `session.user.id` when signed in.

- [ ] **Step 1: Update `api.ts`**

Replace full contents of `frontend/src/lib/api.ts`:

```typescript
// frontend/src/lib/api.ts
import { createClient } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};
```

- [ ] **Step 2: Update `user.ts`**

Replace full contents of `frontend/src/lib/user.ts`:

```typescript
// frontend/src/lib/user.ts
import { createClient } from "./supabase";
import { api } from "./api";

const KEY = "bsc_user_id";

export async function getOrCreateUserId(): Promise<string> {
  if (typeof window === "undefined") throw new Error("client only");

  const { data: { session } } = await createClient().auth.getSession();
  if (session) return session.user.id;

  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const { user_id } = await api.post<{ user_id: string }>("/api/users/anon");
  window.localStorage.setItem(KEY, user_id);
  return user_id;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/user.ts
git commit -m "feat: attach auth header to API calls, check session in getOrCreateUserId"
```

---

## Task 9: Frontend — `/login` page

**Files:**
- Create: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Create the login page**

```typescript
// frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } =
      tab === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/play");
  }

  async function handleGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-8 text-3xl font-bold">Ocean Strike</h1>

      <div className="mb-6 flex border-b">
        <button
          className={`px-4 pb-2 ${tab === "signin" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setTab("signin")}
        >
          Sign In
        </button>
        <button
          className={`px-4 pb-2 ${tab === "signup" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setTab("signup")}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : tab === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 border-t" />
        <span className="text-sm text-gray-500">or</span>
        <div className="flex-1 border-t" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat: add /login page with email/password and Google OAuth"
```

---

## Task 10: Frontend — `/auth/callback` route handler

**Files:**
- Create: `frontend/src/app/auth/callback/route.ts`

This route handles the OAuth redirect from Google. Supabase sends `?code=...` here. The handler exchanges the code for a session, sets cookies, then redirects to `/play`.

- [ ] **Step 1: Create the route handler**

```typescript
// frontend/src/app/auth/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = cookies();

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/play", request.url));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route handler"
```

---

## Task 11: Frontend — `AuthBanner` component

**Files:**
- Create: `frontend/src/components/AuthBanner.tsx`

Shown when: user is not signed in AND has at least one anonymous game (i.e., `localStorage` has `bsc_user_id`).

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/AuthBanner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function AuthBanner() {
  const { user, loading } = useAuth();
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    setHasPlayed(!!localStorage.getItem("bsc_user_id"));
  }, []);

  if (loading || user || !hasPlayed) return null;

  return (
    <div className="flex items-center justify-between border-b bg-blue-50 px-6 py-2 text-sm">
      <span>Sign in to save your stats across devices.</span>
      <Link href="/login" className="ml-4 font-medium text-blue-600 hover:underline">
        Sign in →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthBanner.tsx
git commit -m "feat: add AuthBanner soft gate component"
```

---

## Task 12: Frontend — `NavUser` component

**Files:**
- Create: `frontend/src/components/NavUser.tsx`

Shows a "Sign in" link when unauthenticated, and the user's email + "Sign out" button when authenticated.

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/NavUser.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function NavUser() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link href="/login" className="text-sm text-blue-600 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="max-w-[180px] truncate text-sm">{user.email}</span>
      <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NavUser.tsx
git commit -m "feat: add NavUser component with sign-in link and sign-out"
```

---

## Task 13: Frontend — update `layout.tsx`

**Files:**
- Modify: `frontend/src/app/layout.tsx`

Add a top nav bar with `NavUser` and `AuthBanner` below it.

- [ ] **Step 1: Replace `layout.tsx`**

```typescript
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthBanner } from "@/components/AuthBanner";
import { NavUser } from "@/components/NavUser";

export const metadata: Metadata = {
  title: "Ocean Strike",
  description: "The only Battleship that makes you better at Battleship.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <Link href="/" className="font-bold">
            Ocean Strike
          </Link>
          <NavUser />
        </header>
        <AuthBanner />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify manually**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify:
- Nav bar appears at the top with "Sign in" link on the right
- Clicking "Sign in" navigates to `/login`
- Both "Sign In" and "Sign Up" tabs are present
- "Continue with Google" button is present
- No console errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: add nav bar with NavUser and AuthBanner to layout"
```

---

## Done Checklist

- [ ] Migration applied in Supabase (auth_id column exists)
- [ ] Google OAuth provider enabled in Supabase dashboard
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`
- [ ] All backend tests pass (`uv run pytest`)
- [ ] Frontend type-checks clean (`pnpm typecheck`)
- [ ] `/login` page renders with both tabs and Google button
- [ ] Signing in with email/password redirects to `/play`
- [ ] Signing in with Google goes through `/auth/callback` and lands on `/play`
- [ ] Signed-in user's email appears in nav
- [ ] Sign out clears session, nav reverts to "Sign in"
- [ ] Anonymous user who has played sees the soft gate banner
