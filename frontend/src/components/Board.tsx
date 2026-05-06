"use client";

import Cell from "./Cell";

const SIZE = 10;

export default function Board({
  owner,
  onCellClick,
}: {
  owner: "player" | "enemy";
  onCellClick?: (row: number, col: number) => void;
}) {
  return (
    <div
      className="inline-grid gap-0.5 rounded-md bg-slate-300 p-1"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        return (
          <Cell
            key={i}
            row={row}
            col={col}
            owner={owner}
            onClick={() => onCellClick?.(row, col)}
          />
        );
      })}
    </div>
  );
}
