"use client";

import { useState } from "react";

import type { GameMode } from "@/lib/types";

export function usePlacement(_mode: GameMode) {
  const [ships, setShips] = useState<unknown[]>([]);
  return { ships, setShips };
}
