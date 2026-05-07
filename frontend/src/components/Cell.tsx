"use client";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk" | "preview";

const STATE_CLASS: Record<CellState, string> = {
  empty: "",
  ship: "ship",
  hit: "hit",
  miss: "miss",
  sunk: "sunk",
  preview: "target",
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
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) onClick?.(); }}
      aria-label={`${owner} ${row},${col} ${state}`}
      className={`cell${STATE_CLASS[state] ? ` ${STATE_CLASS[state]}` : ""}`}
      style={{ cursor: disabled ? "default" : owner === "enemy" ? "crosshair" : "default" }}
    />
  );
}
