# Ocean Strike

> The only Battleship that makes you better at Battleship.

LLM-powered Battleship with a post-game Coach that analyzes your behavioral patterns (shot entropy, parity discipline, post-hit follow-through, placement tendencies) and tells you, in plain language, how to play better.

See [SPEC.md](./SPEC.md) for the full technical specification.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** FastAPI (Python 3.11) + LangChain + OpenAI `gpt-4o-mini`
- **DB:** Supabase Postgres
- **Hosting:** Vercel (FE), Railway (BE)

## Local dev

```bash
# Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Copy `.env.example` to `.env` and fill in keys.

## Deployment

### Backend → Railway

1. Create a new Railway project and add a **service from GitHub repo**.
2. Set the **Root Directory** to `backend/` in the service settings — Railway will pick up `backend/Dockerfile` automatically.
3. Add the following environment variables in the Railway dashboard (Variables tab):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_KEY` | Service role key from Supabase → Settings → API |
   | `OPENAI_API_KEY` | Your OpenAI key (required for the Coach) |
   | `CORS_ORIGINS` | Your Vercel frontend URL, e.g. `https://your-app.vercel.app` |

4. Railway injects `PORT` automatically — the Dockerfile uses `${PORT:-8000}` so no extra config is needed.
5. After the first deploy, copy the Railway-generated public URL (e.g. `https://your-app.up.railway.app`) — you'll need it for the frontend.

### Frontend → Vercel

1. Import the GitHub repo in Vercel. Set the **Root Directory** to `frontend/`.
2. Vercel will auto-detect Next.js. No build command changes needed.
3. Add the following environment variables in the Vercel dashboard (Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key from Supabase → Settings → API |
   | `NEXT_PUBLIC_API_URL` | Your Railway backend URL from the step above |

4. Deploy. After the first deploy, copy the Vercel URL and update `CORS_ORIGINS` in Railway to match.

> **Supabase auth callback:** If using Google OAuth, the authorized redirect URI in Google Cloud Console must be `https://<your-supabase-project>.supabase.co/auth/v1/callback`. This is already documented in the Supabase dashboard under Authentication → Providers → Google.

## What's different

- No ads, no paywalls on the core loop
- AI Coach that cites your actual moves, not generic advice
- Stat-driven progression: archetype evolution over time

## Roadmap

- Multiplayer-by-link (WebSocket rooms)
- 3-Minute Blitz mode
- Pro tier: custom skins, deep analytics
- School Tournament mode
- Coach Pro: per-move analysis
