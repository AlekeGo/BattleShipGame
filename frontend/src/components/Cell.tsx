"use client";

export default function Cell({
  row,
  col,
  owner,
  onClick,
}: {
  row: number;
  col: number;
  owner: "player" | "enemy";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${owner} cell ${row},${col}`}
      className="h-8 w-8 bg-slate-100 hover:bg-blue-200"
    />
  );
}
