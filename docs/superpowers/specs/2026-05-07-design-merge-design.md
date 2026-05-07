# Design: Merge `frontend/design/` into Next.js Frontend

**Date:** 2026-05-07  
**Status:** Approved  
**Approach:** CSS-first (Approach A) — use design's CSS class names directly in JSX

---

## Goal

Merge the HTML/CSS notebook/graph-paper design system in `frontend/design/` into the production Next.js 14 App Router frontend. Preserve the visual design exactly as authored. Keep all existing React logic (hooks, state, API calls) intact.

---

## CSS & Fonts

- **`globals.css`**: Replace with:
  1. `@tailwind base/components/utilities` (kept at top)
  2. Google Fonts import: `Caveat`, `Kalam`, `Special Elite`, `JetBrains Mono`
  3. Full `shared.css` design system (CSS variables, `.page`, `.btn`, `.grid-board`, `.app-header`, etc.)
  4. All 7 pages' `<style>` blocks merged in (no conflicts — each is scoped by page-specific wrapper classes)
- Dark mode: **dropped**. The design is warm-paper light-only; no dark variant exists.
- The SVG `<filter id="rough">` moves into `layout.tsx` as a hidden inline SVG, available globally.

---

## Layout

- **`layout.tsx`**: Stripped to `<html>` + `<body>` + SVG filter defs + `{children}`. No shared header, no AuthBanner wrapper. Font loaded via `next/font/google`.
- Each page owns its complete visual structure including header.

---

## New Shared Components

| Component | Renders | Used by |
|---|---|---|
| `AppHeader.tsx` | `.app-header` — wordmark, nav links, user chip | All app pages |
| `RouteBar.tsx` | `.route-bar` — breadcrumb path + right annotation | All app pages |

---

## Pages

Each page: existing React logic preserved, JSX replaced with design structure.

### `/` — Landing (`app/page.tsx`)
- `.top-strip` marketing header (The Coach / Roadmap / Leaderboard / Sign in / Play free)
- Hero: two-column (copy + demo `.grid-board` with coach callout)
- Coach section: `.coach-section` grid (copy + `.coach-card` with stat rows + quote)
- Differentiator section: `.diff-grid` three-column cards
- Roadmap: `.roadmap-track` with `.roadmap-stops` timeline pins
- Play CTA strip: `.play-strip` dark block
- Footer: `.footer` three-column grid

### `/play` — Setup (`app/play/page.tsx`)
- `AppHeader` + `RouteBar`
- `.play-grid` two-column:
  - Left: section eyebrow, mode cards (`.mode-card`, `.mode-row`), fleet checklist (`.hd-card` + `.checklist`)
  - Right: `.placement-board-wrap` with `.grid-board`, `.fleet-row`, `.ship-piece` blocks, `.keys` hints
- `.footer-bar`: back / auto-place / clear / "Set sail" button

### `/game/[id]` — Active game (`app/game/[id]/page.tsx`)
- `AppHeader` + `RouteBar`
- `.battle` three-column:
  - Left: `.board-col` — "Your fleet" label + `.ships-remaining` pips + small `.grid-board`
  - Center: `.center-col` — turn counter triangle + turn message + `.scoreline` + `.turnlog`
  - Right: `.board-col` — "Enemy waters" label + small `.grid-board` (clickable)
- `.control-bar`: resign + coach recording notice

### `/game/[id]/review` — Coach report (`app/game/[id]/review/page.tsx`)
- `AppHeader` + `RouteBar`
- `.report-hero`: archetype name, result stamp, accuracy meta
- `.report-grid` two-column:
  - Left: `.top-mistake` card (verdict + quote) + `.one-win` green card
  - Right: `.stats-card` with `.stat-row` + `.bar` indicators + `.tips-list`
- `.archetype-bar`: evolution `.arch-pills`

### `/login` — Auth (`app/login/page.tsx`)
- `AppHeader` (minimal — just wordmark + "back" link)
- `.login-wrap` two-column:
  - Left: `.login-left` — pitch h1, bullet list, quote card
  - Right: `.login-right` — `.auth-card` with tabs, Google OAuth btn, email/password form
- Auth logic: `supabase.auth.signInWithPassword`, `signUp`, `signInWithOAuth` — unchanged

### `/leaderboard` — Leaderboard (`app/leaderboard/page.tsx`)
- `AppHeader` + `RouteBar`
- `.lb-hero`: "Who actually aims" h1 + your rank sticker
- `.filter-bar`: time period + sort pills (visual only for now, API stub)
- `.regions`: per-region `<table class="lb">` with rank/player/archetype/games/streak/accuracy columns
- API logic unchanged; empty-state rendered as `.hd-card tilt-l`

### `/profile` — Profile (`app/profile/page.tsx`)
- `AppHeader` + `RouteBar`
- `.profile-hero`: `.portrait` placeholder + name/handle/badges
- `.two-col`:
  - Left: `.form-card` — display name, region select, email, checkboxes, save button
  - Right: `.stats-summary` tiles + `.archetype-section` pills + `.recent-list` match rows
- API logic unchanged

---

## Components

| Component | Changes |
|---|---|
| `Board.tsx` / `Cell.tsx` | Render `.grid-board` with `.col-h`/`.row-h` headers; cells carry `hit`/`miss`/`sunk`/`ship`/`target`/`last-shot` classes |
| `ShipPlacer.tsx` | Use `.placement-board-wrap`, `.fleet-row`, `.ship-piece` with `.pellet` blocks, `.keys` |
| `CoachReport.tsx` | Use `.stats-card`, `.stat-row`+`.bar`, `.tips-list`+`.tip`; skeleton uses design's shimmer |
| `FleetStatus.tsx` | Use `.ships-remaining` with `.pip` / `.pip.gone` |
| `NavUser.tsx` | Use `.user-chip` + `.avatar` |
| `AuthBanner.tsx` | Small `.mono` strip below app-header; shown when anonymous + ≥1 game played |

---

## What Does NOT Change

- All hook logic: `useGame.ts`, `usePlacement.ts`, `useAuth.ts`
- All API calls: `lib/api.ts`, `lib/user.ts`, `lib/supabase.ts`
- All types: `lib/types.ts`
- Backend: untouched
- Auth flow: Supabase session, JWT, `get_auth_user` — untouched

---

## Constraints

- Next.js 14 App Router — `params` is a plain object, not a Promise
- `npm install --legacy-peer-deps` required
- Design classes used verbatim; no Tailwind translation
- No new dependencies needed (fonts via Google CDN or `next/font/google`)
