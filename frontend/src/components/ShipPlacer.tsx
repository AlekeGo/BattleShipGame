"use client";

import { useEffect } from "react";
import Board from "./Board";
import { usePlacement, type PlacedShip } from "@/hooks/usePlacement";

export default function ShipPlacer({
  onConfirm,
  onAutoPlace,
}: {
  onConfirm: (ships: PlacedShip[]) => void;
  onAutoPlace: () => void;
}) {
  const {
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
  } = usePlacement();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") toggleOrientation();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleOrientation]);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Place Your Fleet</h2>
        <p className="mb-3 text-sm text-slate-500">
          Click a ship, then click the board. Press{" "}
          <kbd className="rounded bg-slate-200 px-1">R</kbd> to rotate.
        </p>
        <Board
          owner="player"
          cellStates={cellStates}
          onCellClick={placeShip}
          onCellHover={(r, c) => setHoverCell([r, c])}
        />
      </div>

      <div className="flex min-w-44 flex-col gap-3">
        <h3 className="font-medium">Fleet</h3>

        <div className="space-y-2">
          {unplacedFleet.map((ship) => (
            <button
              key={ship.name}
              onClick={() =>
                setSelectedShip(selectedShip?.name === ship.name ? null : ship)
              }
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedShip?.name === ship.name
                  ? "border-blue-500 bg-blue-50 font-semibold"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              {ship.name} ({ship.size})
            </button>
          ))}
        </div>

        {placed.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-slate-500">Placed:</p>
            {placed.map((ship) => (
              <div key={ship.name} className="flex items-center justify-between text-sm">
                <span>{ship.name}</span>
                <button
                  onClick={() => removeShip(ship.name)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            onClick={toggleOrientation}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Rotate ({orientation})
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            onClick={onAutoPlace}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Auto-Place
          </button>
          <button
            disabled={!isComplete}
            onClick={() => onConfirm(placed)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            Start Game →
          </button>
        </div>
      </div>
    </div>
  );
}
