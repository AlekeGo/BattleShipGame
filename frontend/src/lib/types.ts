export type Coord = { row: number; col: number };

export type GameMode = "pvbot_easy" | "pvbot_medium" | "pvbot_hard" | "hotseat";

export type ShotResult = {
  result: "hit" | "miss" | "sunk";
  sunk_ship?: string | null;
  bot_move?: { coord: Coord; result: "hit" | "miss" | "sunk"; sunk_ship?: string | null } | null;
  game_over: boolean;
  winner?: "player" | "bot" | null;
};

export type Archetype =
  | "Random Shooter"
  | "Aggressive Hunter"
  | "Methodical Planner"
  | "Defensive Placer"
  | "Pattern-Locked";

export type CoachAnalysis = {
  archetype: Archetype;
  top_mistake: string;
  tips: [string, string, string];
  did_well: string;
};
