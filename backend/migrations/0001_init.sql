CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL,
  player_board JSONB NOT NULL,
  bot_board JSONB,
  moves JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  winner TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE analyses (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  features JSONB NOT NULL,
  archetype TEXT NOT NULL,
  top_mistake TEXT NOT NULL,
  tips JSONB NOT NULL,
  did_well TEXT NOT NULL,
  llm_raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
