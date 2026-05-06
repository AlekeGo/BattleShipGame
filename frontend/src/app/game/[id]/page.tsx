"use client";

import Link from "next/link";
import Board from "@/components/Board";
import { useGame } from "@/hooks/useGame";

export default function GamePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { gameState, busy, lastResult, shoot, playerCells, enemyCells } = useGame(id);

  if (!gameState) {
    return <main className="p-8 text-center text-slate-500">Loading…</main>;
  }

  const isOver = gameState.status === "finished";
  const won = gameState.winner === "player";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Ocean Strike</h1>
        {busy && <span className="text-sm text-slate-500">Processing…</span>}
        {lastResult && !isOver && (
          <span
            className={`text-sm font-medium ${
              lastResult.result === "miss" ? "text-slate-500" : "text-red-600"
            }`}
          >
            Your shot: {lastResult.result.toUpperCase()}
            {lastResult.bot_move && ` · Bot: ${lastResult.bot_move.result.toUpperCase()}`}
          </span>
        )}
      </div>

      {isOver && (
        <div
          className={`mb-6 rounded-xl p-4 text-center text-lg font-bold ${
            won ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {won ? "You won! 🎉" : "You lost. Better luck next time."}
          <div className="mt-2 space-x-4 text-sm font-normal">
            <Link href={`/game/${id}/review`} className="underline">
              See AI Coach Report →
            </Link>
            <Link href="/play" className="underline">
              Play again
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Your Fleet</h2>
          <Board owner="player" cellStates={playerCells} />
        </div>
        <div>
          <h2 className="mb-2 font-semibold">
            Enemy Waters{" "}
            {!isOver && (
              <span className="text-sm font-normal text-slate-400">(click to shoot)</span>
            )}
          </h2>
          <Board
            owner="enemy"
            cellStates={enemyCells}
            onCellClick={isOver ? undefined : (r, c) => shoot(r, c)}
          />
        </div>
      </div>
    </main>
  );
}
