"use client";

import Cell, { type CellState } from "./Cell";

const SIZE = 10;

export default function Board({
  owner,
  cellStates = {},
  onCellClick,
  onCellHover,
}: {
  owner: "player" | "enemy";
  cellStates?: Record<string, CellState>;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
}) {
  return (
    <div
      className="inline-grid gap-px rounded-md bg-slate-400 p-px"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const key = `${row},${col}`;
        return (
          <Cell
            key={i}
            row={row}
            col={col}
            owner={owner}
            state={cellStates[key] ?? "empty"}
            onClick={() => onCellClick?.(row, col)}
            onHover={() => onCellHover?.(row, col)}
          />
        );
      })}
    </div>
  );
}
