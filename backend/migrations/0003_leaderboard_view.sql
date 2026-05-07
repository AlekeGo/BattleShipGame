CREATE VIEW regional_leaderboard AS
SELECT
  u.region,
  u.display_name,
  COUNT(g.id) FILTER (WHERE g.winner = 'player') AS wins,
  COUNT(g.id) AS total_games,
  ROUND(
    100.0 * SUM(CASE WHEN g.winner = 'player' THEN jsonb_array_length(g.moves) ELSE 0 END)
    / NULLIF(SUM(jsonb_array_length(g.moves)), 0),
    2
  ) AS accuracy_pct
FROM users u
JOIN games g ON g.user_id = u.id
WHERE g.status = 'finished' AND u.region IS NOT NULL
GROUP BY u.region, u.display_name;
