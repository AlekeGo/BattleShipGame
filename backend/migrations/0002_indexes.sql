CREATE INDEX idx_games_user ON games(user_id, ended_at DESC);
CREATE INDEX idx_games_region ON games(user_id) WHERE status = 'finished';
