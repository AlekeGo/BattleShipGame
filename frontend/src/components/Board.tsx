"use client";

import Cell, { type CellState } from "./Cell";

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function Board({
  owner,
  cellStates = {},
  onCellClick,
  onCellHover,
  small,
}: {
  owner: "player" | "enemy";
  cellStates?: Record<string, CellState>;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  small?: boolean;
}) {
  return (
    <div className={`grid-board${small ? " small" : ""}`} aria-label={owner === "player" ? "Your fleet" : "Enemy waters"}>
      <div className="corner" />
      {COLS.map((c) => <div key={c} className="col-h">{c}</div>)}
      {ROWS.flatMap((r) => [
        <div key={`rh-${r}`} className="row-h">{r}</div>,
        ...COLS.map((_, ci) => {
          const row = r - 1;
          const col = ci;
          const key = `${row},${col}`;
          return (
            <Cell
              key={key}
              row={row}
              col={col}
              owner={owner}
              state={cellStates[key] ?? "empty"}
              onClick={() => onCellClick?.(row, col)}
              onHover={() => onCellHover?.(row, col)}
            />
          );
        }),
      ])}
    </div>
  );
}
