"use client";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk" | "preview";

const STATE_CLASSES: Record<CellState, string> = {
  empty: "bg-slate-100 hover:bg-blue-200 cursor-pointer",
  ship: "bg-blue-500",
  hit: "bg-red-500 cursor-default",
  miss: "bg-slate-300 cursor-default",
  sunk: "bg-red-800 cursor-default",
  preview: "bg-blue-300 cursor-pointer",
};

export default function Cell({
  row,
  col,
  owner,
  state = "empty",
  onClick,
  onHover,
}: {
  row: number;
  col: number;
  owner: "player" | "enemy";
  state?: CellState;
  onClick?: () => void;
  onHover?: () => void;
}) {
  const disabled = state === "hit" || state === "miss" || state === "sunk";
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover}
      aria-label={`${owner} ${row},${col} ${state}`}
      className={`h-8 w-8 border border-slate-200 transition-colors ${STATE_CLASSES[state]}`}
    />
  );
}
