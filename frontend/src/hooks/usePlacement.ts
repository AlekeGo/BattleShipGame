"use client";

import { useState, useCallback } from "react";
import type { CellState } from "@/components/Cell";

export type ShipSpec = { name: string; size: number };
export type PlacedShip = ShipSpec & { row: number; col: number; orientation: "H" | "V" };

const FLEET: ShipSpec[] = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

function shipCells(row: number, col: number, size: number, orientation: "H" | "V") {
  return Array.from({ length: size }, (_, i) =>
    orientation === "H" ? [row, col + i] : [row + i, col]
  );
}

function isInBounds(row: number, col: number) {
  return row >= 0 && row < 10 && col >= 0 && col < 10;
}

export function usePlacement() {
  const [placed, setPlaced] = useState<PlacedShip[]>([]);
  const [selectedShip, setSelectedShip] = useState<ShipSpec | null>(null);
  const [orientation, setOrientation] = useState<"H" | "V">("H");
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  const unplacedFleet = FLEET.filter((s) => !placed.find((p) => p.name === s.name));

  const toggleOrientation = useCallback(() => {
    setOrientation((o) => (o === "H" ? "V" : "H"));
  }, []);

  const placeShip = useCallback(
    (row: number, col: number) => {
      if (!selectedShip) return;
      const cells = shipCells(row, col, selectedShip.size, orientation);
      if (!cells.every(([r, c]) => isInBounds(r, c))) return;
      const occupiedKeys = new Set(
        placed.flatMap((p) =>
          shipCells(p.row, p.col, p.size, p.orientation).map(([r, c]) => `${r},${c}`)
        )
      );
      if (cells.some(([r, c]) => occupiedKeys.has(`${r},${c}`))) return;

      setPlaced((prev) => [...prev, { ...selectedShip, row, col, orientation }]);
      setSelectedShip(null);
    },
    [selectedShip, orientation, placed]
  );

  const removeShip = useCallback((name: string) => {
    setPlaced((prev) => prev.filter((s) => s.name !== name));
  }, []);

  const reset = useCallback(() => {
    setPlaced([]);
    setSelectedShip(null);
  }, []);

  const cellStates: Record<string, CellState> = {};
  for (const ship of placed) {
    for (const [r, c] of shipCells(ship.row, ship.col, ship.size, ship.orientation)) {
      cellStates[`${r},${c}`] = "ship";
    }
  }
  if (selectedShip && hoverCell) {
    const [hr, hc] = hoverCell;
    const previewCells = shipCells(hr, hc, selectedShip.size, orientation);
    const occupied = new Set(Object.keys(cellStates));
    const valid = previewCells.every(([r, c]) => isInBounds(r, c) && !occupied.has(`${r},${c}`));
    for (const [r, c] of previewCells) {
      if (isInBounds(r, c)) {
        cellStates[`${r},${c}`] = valid ? "preview" : "hit";
      }
    }
  }

  const isComplete = placed.length === FLEET.length;

  return {
    placed,
    unplacedFleet,
    selectedShip,
    setSelectedShip,
    orientation,
    toggleOrientation,
    placeShip,
    removeShip,
    reset,
    setHoverCell,
    cellStates,
    isComplete,
  };
}
