"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { ShotResult } from "@/lib/types";

export function useGame(gameId: string) {
  const [busy, setBusy] = useState(false);

  async function shoot(row: number, col: number): Promise<ShotResult> {
    setBusy(true);
    try {
      return await api.post<ShotResult>(`/api/games/${gameId}/shoot`, { coord: { row, col } });
    } finally {
      setBusy(false);
    }
  }

  return { busy, shoot };
}
