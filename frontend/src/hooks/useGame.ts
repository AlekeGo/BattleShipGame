"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { CellState } from "@/components/Cell";
import type { ShotResult } from "@/lib/types";

type ShipDict = {
  name: string;
  size: number;
  row: number;
  col: number;
  orientation: "H" | "V";
  hits: [number, number][];
};

type ShotRecord = {
  coord: [number, number];
  result: "hit" | "miss" | "sunk";
  sunk_ship?: string | null;
};

type GameState = {
  game_id: string;
  status: string;
  player_ships: ShipDict[];
  player_shots_received: ShotRecord[];
  my_shots: ShotRecord[];
  winner: string | null;
};

function buildPlayerCells(
  ships: ShipDict[],
  shotsReceived: ShotRecord[]
): Record<string, CellState> {
  const states: Record<string, CellState> = {};
  for (const ship of ships) {
    const cells = Array.from({ length: ship.size }, (_, i) =>
      ship.orientation === "H"
        ? [ship.row, ship.col + i]
        : [ship.row + i, ship.col]
    ) as [number, number][];
    const hitSet = new Set(ship.hits.map(([r, c]) => `${r},${c}`));
    const isSunk = ship.hits.length === ship.size;
    for (const [r, c] of cells) {
      states[`${r},${c}`] = isSunk ? "sunk" : hitSet.has(`${r},${c}`) ? "hit" : "ship";
    }
  }
  for (const shot of shotsReceived) {
    const key = `${shot.coord[0]},${shot.coord[1]}`;
    if (!(key in states)) {
      states[key] = shot.result === "miss" ? "miss" : "hit";
    }
  }
  return states;
}

function buildEnemyCells(myShots: ShotRecord[]): Record<string, CellState> {
  const states: Record<string, CellState> = {};
  for (const shot of myShots) {
    states[`${shot.coord[0]},${shot.coord[1]}`] =
      shot.result === "sunk" ? "sunk" : shot.result === "hit" ? "hit" : "miss";
  }
  return states;
}

export function useGame(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);

  const refresh = useCallback(async () => {
    const data = await api.get<GameState>(`/api/games/${gameId}`);
    setGameState(data);
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shoot = useCallback(
    async (row: number, col: number) => {
      if (busy || !gameState || gameState.status !== "active") return;
      setBusy(true);
      try {
        const result = await api.post<ShotResult>(`/api/games/${gameId}/shoot`, {
          coord: { row, col },
        });
        setLastResult(result);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, gameState, gameId, refresh]
  );

  const playerCells = gameState
    ? buildPlayerCells(gameState.player_ships, gameState.player_shots_received)
    : {};
  const enemyCells = gameState ? buildEnemyCells(gameState.my_shots) : {};

  return { gameState, busy, lastResult, shoot, playerCells, enemyCells };
}
