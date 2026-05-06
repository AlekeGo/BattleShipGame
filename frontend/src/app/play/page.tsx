"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ShipPlacer from "@/components/ShipPlacer";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";
import type { GameMode } from "@/lib/types";
import type { PlacedShip } from "@/hooks/usePlacement";

const MODE_LABELS: Record<GameMode, string> = {
  pvbot_easy: "Easy",
  pvbot_medium: "Medium",
  pvbot_hard: "Hard",
  hotseat: "Hot-Seat (2 players)",
};

export default function PlayPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("pvbot_medium");
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startNewGame() {
    setLoading(true);
    setError(null);
    try {
      const userId = await getOrCreateUserId();
      const { game_id } = await api.post<{ game_id: string; fleet: unknown[] }>("/api/games", {
        user_id: userId,
        mode,
      });
      setGameId(game_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoPlace() {
    if (!gameId) return;
    try {
      await api.post(`/api/games/${gameId}/place-auto`);
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleConfirm(ships: PlacedShip[]) {
    if (!gameId) return;
    setLoading(true);
    try {
      await api.post(`/api/games/${gameId}/place`, { ships });
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (gameId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-3xl font-bold">Place Your Ships</h1>
        {error && <p className="mb-4 text-red-600">{error}</p>}
        <ShipPlacer onConfirm={handleConfirm} onAutoPlace={handleAutoPlace} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold">New Game</h1>
      <p className="mt-2 text-slate-500">Choose a difficulty and start playing.</p>

      <div className="mt-6 space-y-2">
        {(Object.entries(MODE_LABELS) as [GameMode, string][]).map(([m, label]) => (
          <label
            key={m}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              mode === m ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <input
              type="radio"
              className="accent-blue-600"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <span className="font-medium">{label}</span>
          </label>
        ))}
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <button
        onClick={startNewGame}
        disabled={loading}
        className="mt-6 w-full rounded-md bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Starting…" : "Start Game →"}
      </button>
    </main>
  );
}
