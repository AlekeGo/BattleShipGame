"use client";

import { useEffect } from "react";
import Board from "./Board";
import { usePlacement, type PlacedShip } from "@/hooks/usePlacement";

const SHIP_PELLETS: Record<string, number> = {
  Carrier: 5, Battleship: 4, Cruiser: 3, Submarine: 3, Destroyer: 2,
};

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

  const allShips = [
    ...placed.map((s) => ({ ...s, isPlaced: true })),
    ...unplacedFleet.map((s) => ({ ...s, isPlaced: false })),
  ];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") toggleOrientation();
      if (e.key === "Backspace" && placed.length > 0) {
        removeShip(placed[placed.length - 1].name);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleOrientation, placed, removeShip]);

  return (
    <section className="placement-board-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
        <span className="sticker">YOUR WATERS</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "1.5px" }}>
          {placed.length} / {placed.length + unplacedFleet.length} PLACED
        </span>
      </div>

      <Board
        owner="player"
        cellStates={cellStates}
        onCellClick={placeShip}
        onCellHover={(r, c) => setHoverCell([r, c])}
      />

      <div className="fleet-row">
        {allShips.map((ship) => {
          const pellets = SHIP_PELLETS[ship.name] ?? ship.size;
          const isSelected = selectedShip?.name === ship.name;
          return (
            <div
              key={ship.name}
              className={`ship-piece${ship.isPlaced ? " placed" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => !ship.isPlaced && setSelectedShip(isSelected ? null : ship)}
              style={isSelected ? { borderColor: "var(--hit)", borderStyle: "solid", background: "rgba(200,31,44,0.08)" } : undefined}
            >
              <span className="pellets">
                {Array.from({ length: pellets }).map((_, i) => <span key={i} className="pellet" />)}
              </span>
              {ship.name.toUpperCase()} · {ship.size}
              {ship.isPlaced && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeShip(ship.name); }}
                  style={{ marginLeft: 4, color: "var(--hit)", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                >✕</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="keys">
        <span className="key"><span className="kbd">CLICK</span> to place</span>
        <span className="key"><span className="kbd">R</span> rotate ({orientation})</span>
        <span className="key"><span className="kbd">⌫</span> remove last</span>
      </div>
    </section>
  );
}
