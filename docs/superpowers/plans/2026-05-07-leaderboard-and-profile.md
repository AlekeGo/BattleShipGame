# Leaderboard & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `regional_leaderboard` DB view to a real API endpoint, build a grouped leaderboard page, and add a profile page where users can set their display name and region.

**Architecture:** Backend adds one new `PATCH /api/users/{id}/profile` endpoint and one `GET /api/users/{id}` endpoint, plus replaces the leaderboard stub with a direct Supabase view query. Frontend replaces two stubs with full pages and adds `api.patch` to the API client.

**Tech Stack:** FastAPI + supabase-py 2.x (backend), Next.js 14 App Router + TypeScript + Tailwind (frontend), pytest with `fastapi.testclient` + `unittest.mock` (tests).

---

## File Map

**Create:**
- `backend/tests/test_api_leaderboard.py` — leaderboard endpoint tests
- `frontend/src/app/profile/page.tsx` — profile page

**Modify:**
- `backend/app/schemas/user.py` — add `ProfileUpdate`, `UserResponse`
- `backend/app/db/repositories/users.py` — add `update_profile()`
- `backend/app/api/users.py` — add `GET /{user_id}`, `PATCH /{user_id}/profile`
- `backend/app/api/leaderboard.py` — implement endpoint
- `backend/tests/test_api_users.py` — add get-user and update-profile tests
- `frontend/src/lib/api.ts` — add `api.patch`
- `frontend/src/app/leaderboard/page.tsx` — full grouped implementation
- `frontend/src/app/layout.tsx` — add nav links

---

## Task 1: ProfileUpdate schema + UsersRepo.update_profile

**Files:**
- Modify: `backend/app/schemas/user.py`
- Modify: `backend/app/db/repositories/users.py`

- [ ] **Step 1: Add ProfileUpdate and UserResponse to schemas**

Replace the full contents of `backend/app/schemas/user.py`:

```python
from pydantic import BaseModel


class UserCreated(BaseModel):
    user_id: str


class RegionUpdate(BaseModel):
    region: str


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    region: str | None = None


class UserResponse(BaseModel):
    id: str
    display_name: str | None
    region: str | None
    email: str | None
```

- [ ] **Step 2: Add update_profile to UsersRepo**

In `backend/app/db/repositories/users.py`, add this method inside the `UsersRepo` class after `set_region`:

```python
async def update_profile(self, user_id: str, display_name: str | None, region: str | None) -> dict:
    data: dict = {}
    if display_name is not None:
        data["display_name"] = display_name
    if region is not None:
        data["region"] = region
    if not data:
        res = self.db.table("users").select("*").eq("id", user_id).maybe_single().execute()
        return res.data
    res = self.db.table("users").update(data).eq("id", user_id).execute()
    return res.data[0]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/user.py backend/app/db/repositories/users.py
git commit -m "feat: add ProfileUpdate schema and UsersRepo.update_profile"
```

---

## Task 2: GET /api/users/{user_id} endpoint

**Files:**
- Modify: `backend/app/api/users.py`
- Modify: `backend/tests/test_api_users.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_api_users.py`:

```python
def test_get_user_returns_user():
    mock_repo = MagicMock()
    mock_repo.get = AsyncMock(return_value={
        "id": "user-123", "display_name": "Cap", "region": "Almaty, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.get("/api/users/user-123")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["display_name"] == "Cap"
    assert res.json()["region"] == "Almaty, KZ"


def test_get_user_404_when_not_found():
    mock_repo = MagicMock()
    mock_repo.get = AsyncMock(return_value=None)

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.get("/api/users/missing-user")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_api_users.py::test_get_user_returns_user -v
```

Expected: `FAILED` — route does not exist yet (404 from FastAPI).

- [ ] **Step 3: Add GET /{user_id} route**

In `backend/app/api/users.py`, add the import for `HTTPException` and the new route. Replace the full file:

```python
from fastapi import APIRouter, Depends, HTTPException

from app.db.repositories.users import UsersRepo
from app.deps import get_users_repo
from app.schemas.user import ProfileUpdate, RegionUpdate, UserCreated

router = APIRouter()


@router.post("/anon", response_model=UserCreated)
async def create_anon_user(repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.create_anon()
    return {"user_id": user["id"]}


@router.post("/{user_id}/region")
async def set_region(
    user_id: str,
    payload: RegionUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    await repo.set_region(user_id, payload.region)
    return {"ok": True}


@router.get("/{user_id}")
async def get_user(user_id: str, repo: UsersRepo = Depends(get_users_repo)):
    user = await repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_api_users.py -v
```

Expected: all tests in file PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/users.py backend/tests/test_api_users.py
git commit -m "feat: add GET /api/users/{id} endpoint"
```

---

## Task 3: PATCH /api/users/{user_id}/profile endpoint

**Files:**
- Modify: `backend/app/api/users.py`
- Modify: `backend/tests/test_api_users.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_api_users.py`:

```python
def test_update_profile_saves_name_and_region():
    mock_repo = MagicMock()
    mock_repo.update_profile = AsyncMock(return_value={
        "id": "user-123", "display_name": "New Name", "region": "Astana, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.patch(
            "/api/users/user-123/profile",
            json={"display_name": "New Name", "region": "Astana, KZ"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["display_name"] == "New Name"
    assert res.json()["region"] == "Astana, KZ"
    mock_repo.update_profile.assert_called_once_with("user-123", "New Name", "Astana, KZ")


def test_update_profile_partial_update():
    mock_repo = MagicMock()
    mock_repo.update_profile = AsyncMock(return_value={
        "id": "user-123", "display_name": None, "region": "Almaty, KZ", "email": None
    })

    app.dependency_overrides[get_users_repo] = lambda: mock_repo
    app.dependency_overrides[get_supabase] = lambda: MagicMock()

    try:
        client = TestClient(app)
        res = client.patch("/api/users/user-123/profile", json={"region": "Almaty, KZ"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    mock_repo.update_profile.assert_called_once_with("user-123", None, "Almaty, KZ")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_api_users.py::test_update_profile_saves_name_and_region -v
```

Expected: `FAILED` — route does not exist yet.

- [ ] **Step 3: Add PATCH /{user_id}/profile route**

In `backend/app/api/users.py`, append after `get_user`:

```python
@router.patch("/{user_id}/profile")
async def update_profile(
    user_id: str,
    payload: ProfileUpdate,
    repo: UsersRepo = Depends(get_users_repo),
):
    user = await repo.update_profile(user_id, payload.display_name, payload.region)
    return user
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_api_users.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/users.py backend/tests/test_api_users.py
git commit -m "feat: add PATCH /api/users/{id}/profile endpoint"
```

---

## Task 4: Leaderboard endpoint

**Files:**
- Create: `backend/tests/test_api_leaderboard.py`
- Modify: `backend/app/api/leaderboard.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_api_leaderboard.py`:

```python
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_supabase

ROWS = [
    {"region": "Almaty", "display_name": "Top Gun", "wins": 10, "total_games": 15, "accuracy_pct": 72.5},
    {"region": "Astana", "display_name": "Sniper", "wins": 8, "total_games": 12, "accuracy_pct": 68.0},
]


def _mock_db_no_filter(rows):
    mock_db = MagicMock()
    (
        mock_db.table.return_value
        .select.return_value
        .order.return_value
        .execute.return_value
        .data
    ) = rows
    return mock_db


def _mock_db_with_filter(rows):
    mock_db = MagicMock()
    (
        mock_db.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value
        .data
    ) = rows
    return mock_db


def test_leaderboard_returns_all_rows():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_no_filter(ROWS)
    try:
        res = TestClient(app).get("/api/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["region"] == "Almaty"
    assert data[1]["region"] == "Astana"


def test_leaderboard_region_filter():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_with_filter([ROWS[0]])
    try:
        res = TestClient(app).get("/api/leaderboard?region=Almaty")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["region"] == "Almaty"


def test_leaderboard_empty():
    app.dependency_overrides[get_supabase] = lambda: _mock_db_no_filter([])
    try:
        res = TestClient(app).get("/api/leaderboard")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json() == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_api_leaderboard.py -v
```

Expected: `FAILED` — endpoint returns 501.

- [ ] **Step 3: Implement leaderboard endpoint**

Replace `backend/app/api/leaderboard.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.supabase import get_supabase

router = APIRouter()


@router.get("")
async def leaderboard(region: str | None = None, db: Client = Depends(get_supabase)):
    try:
        q = db.table("regional_leaderboard").select("*")
        if region:
            q = q.eq("region", region)
        res = q.order("accuracy_pct", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_api_leaderboard.py -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd backend && uv run pytest -v
```

Expected: all tests PASS (currently 50+; all should still pass).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/leaderboard.py backend/tests/test_api_leaderboard.py
git commit -m "feat: implement GET /api/leaderboard endpoint"
```

---

## Task 5: Frontend — api.patch + leaderboard page

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/leaderboard/page.tsx`

- [ ] **Step 1: Add api.patch to the API client**

Replace `frontend/src/lib/api.ts`:

```typescript
import { createClient } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const {
    data: { session },
  } = await createClient().auth.getSession();
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
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};
```

- [ ] **Step 2: Implement the leaderboard page**

Replace `frontend/src/app/leaderboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type LeaderboardRow = {
  region: string;
  display_name: string | null;
  wins: number;
  total_games: number;
  accuracy_pct: number;
};

function groupByRegion(rows: LeaderboardRow[]): Map<string, LeaderboardRow[]> {
  const map = new Map<string, LeaderboardRow[]>();
  for (const row of rows) {
    const group = map.get(row.region) ?? [];
    group.push(row);
    map.set(row.region, group);
  }
  return map;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<LeaderboardRow[]>("/api/leaderboard")
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="mt-4 text-red-600">Could not load leaderboard. Please try again.</p>
      </main>
    );
  }

  if (rows === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="mt-8 space-y-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-32 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (rows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="mt-4 opacity-60">
          No ranked players yet.{" "}
          <Link href="/play" className="underline">
            Play a game
          </Link>{" "}
          and set your region in{" "}
          <Link href="/profile" className="underline">
            Profile
          </Link>{" "}
          to appear here.
        </p>
      </main>
    );
  }

  const grouped = groupByRegion(rows);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      {Array.from(grouped.entries()).map(([region, players]) => (
        <section key={region}>
          <h2 className="text-lg font-semibold mb-3">{region}</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-2 text-left font-medium opacity-60">Rank</th>
                  <th className="px-4 py-2 text-left font-medium opacity-60">Player</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Wins</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Games</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={`${region}-${i}`}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{p.display_name ?? "Anonymous"}</td>
                    <td className="px-4 py-3 text-right">{p.wins}</td>
                    <td className="px-4 py-3 text-right">{p.total_games}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.accuracy_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/leaderboard/page.tsx
git commit -m "feat: implement leaderboard page with grouped regions"
```

---

## Task 6: Frontend — profile page

**Files:**
- Create: `frontend/src/app/profile/page.tsx`

- [ ] **Step 1: Create the profile page**

Create `frontend/src/app/profile/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";

type UserRecord = {
  id: string;
  display_name: string | null;
  region: string | null;
  email: string | null;
};

type StatsData = {
  total_games: number;
  wins: number;
  win_rate: number;
  accuracy_pct: number;
  streak: number;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide opacity-50">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-sm opacity-60">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    getOrCreateUserId().then(async (uid) => {
      try {
        const [userRes, statsRes] = await Promise.all([
          api.get<UserRecord>(`/api/users/${uid}`),
          api.get<StatsData>(`/api/users/${uid}/stats`),
        ]);
        setDisplayName(userRes.display_name ?? "");
        setRegion(userRes.region ?? "");
        setStats(statsRes);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const uid = await getOrCreateUserId();
      await api.patch(`/api/users/${uid}/profile`, {
        display_name: displayName || null,
        region: region || null,
      });
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-4 text-red-600">Could not load profile. Please try again.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Profile</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your identity</h2>
        <p className="text-sm opacity-60">
          Set your display name and region to appear on the{" "}
          <Link href="/leaderboard" className="underline">
            leaderboard
          </Link>
          .
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Captain Almaty"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <input
              type="text"
              maxLength={50}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Almaty, KZ"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          {saveError && <span className="text-sm text-red-600">Save failed. Try again.</span>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your stats</h2>
        {stats && stats.total_games > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Win rate"
              value={`${stats.win_rate}%`}
              sub={`${stats.wins} / ${stats.total_games} games`}
            />
            <StatCard label="Accuracy" value={`${stats.accuracy_pct}%`} sub="shots on target" />
            <StatCard
              label="Win streak"
              value={String(stats.streak)}
              sub={stats.streak === 1 ? "game" : "games"}
            />
            <StatCard label="Total games" value={String(stats.total_games)} />
          </div>
        ) : (
          <p className="text-sm opacity-60">
            No games yet.{" "}
            <Link href="/play" className="underline">
              Play your first game
            </Link>{" "}
            to see stats here.
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat: add profile page with name/region form and stats summary"
```

---

## Task 7: Nav links

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add nav links to layout**

Replace `frontend/src/app/layout.tsx`:

```tsx
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
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold">
              Ocean Strike
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/play" className="opacity-70 hover:opacity-100 transition-opacity">
                Play
              </Link>
              <Link href="/stats" className="opacity-70 hover:opacity-100 transition-opacity">
                Stats
              </Link>
              <Link href="/leaderboard" className="opacity-70 hover:opacity-100 transition-opacity">
                Leaderboard
              </Link>
              <Link href="/profile" className="opacity-70 hover:opacity-100 transition-opacity">
                Profile
              </Link>
            </nav>
          </div>
          <NavUser />
        </header>
        <AuthBanner />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run full backend test suite one final time**

```bash
cd backend && uv run pytest -v
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: add Play, Stats, Leaderboard, Profile nav links"
```
