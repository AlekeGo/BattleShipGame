"use client";

import Link from "next/link";
import Board from "@/components/Board";
import FleetStatus from "@/components/FleetStatus";
import { AppHeader } from "@/components/AppHeader";
import { RouteBar } from "@/components/RouteBar";
import { useGame } from "@/hooks/useGame";

export default function GamePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { gameState, busy, lastResult, shoot, playerCells, enemyCells } = useGame(id);

  if (!gameState) {
    return (
      <main className="page">
        <AppHeader />
        <div style={{ padding: "80px 100px", textAlign: "center" }}>
          <p className="mono" style={{ fontSize: 14, color: "var(--ink-soft)", letterSpacing: "1.5px" }}>// loading game state…</p>
        </div>
      </main>
    );
  }

  const isOver = gameState.status === "finished";
  const won = gameState.winner === "player";
  const turn = gameState.my_shots?.length ?? 0;

  const playerShips = (gameState.player_ships ?? []).map((s) => ({
    name: s.name,
    sunk: s.hits.length >= s.size,
  }));

  const botShips = Array.from({ length: 5 }).map((_, i) => ({
    name: `ship${i}`,
    sunk: false,
  }));

  const myShots = gameState.my_shots ?? [];
  const lastFive = [...myShots].reverse().slice(0, 10);

  return (
    <main className="page wide">
      <AppHeader
        navLinks={[{ href: "/play", label: "New game" }]}
        rightExtra={
          <span className="mono" style={{ fontSize: 12, letterSpacing: "1.5px", color: "var(--ink-soft)" }}>
            MATCH IN PROGRESS
          </span>
        }
      />
      <RouteBar
        path={`game/${id.slice(0, 8)}`}
        label={`turn ${turn} of unknown`}
        right={isOver ? (won ? "✓ VICTORY" : "✗ DEFEAT") : "● live"}
      />

      {isOver && (
        <div style={{
          padding: "18px 100px",
          borderBottom: "2px dashed rgba(46,31,158,0.35)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: won ? "rgba(74,155,52,0.08)" : "rgba(200,31,44,0.06)",
        }}>
          <div>
            <p className="hand" style={{ fontSize: 36, fontWeight: 700, color: won ? "var(--green)" : "var(--hit)", margin: 0 }}>
              {won ? "Victory!" : "Defeated."}
            </p>
            <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)", letterSpacing: "1.5px", margin: "4px 0 0" }}>
              {turn} turns
            </p>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <Link href={`/game/${id}/review`} className="btn">See Coach report →</Link>
            <Link href="/play" className="btn ghost">Play again</Link>
          </div>
        </div>
      )}

      <section className="battle">
        {/* LEFT: your fleet */}
        <div className="board-col">
          <div className="head-row">
            <h3>Your fleet</h3>
            <FleetStatus ships={playerShips} />
          </div>
          <Board owner="player" cellStates={playerCells} small />
          <p className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "1.5px" }}>
            // {playerShips.filter(s => s.sunk).length} sunk · {playerShips.filter(s => !s.sunk).length} afloat
          </p>
        </div>

        {/* CENTER: turn counter + score + log */}
        <div className="center-col">
          <div className="turn-label">TURN {turn}</div>
          <div className={`turn-counter${busy ? "" : ""}`}>
            {busy ? "…" : isOver ? (won ? "W" : "L") : "YOU"}
          </div>
          <div className="turn-msg">
            {busy ? "Processing…" : isOver ? (won ? "Well played." : "Better luck.") : "Take a shot,\ncommander."}
          </div>

          {lastResult && !isOver && (
            <div className="scoreline" style={{ fontSize: 13, color: lastResult.result === "miss" ? "var(--ink-soft)" : "var(--hit)" }}>
              <div className="name" style={{ textAlign: "right" }}>YOUR<small>shot</small></div>
              <div className="vs">{lastResult.result.toUpperCase()}</div>
              <div className="name">BOT<small>{lastResult.bot_move?.result ?? "—"}</small></div>
            </div>
          )}

          <div className="turnlog">
            <h4>TURN LOG</h4>
            <ul>
              {lastFive.map((entry, i) => {
                const [r, c] = entry.coord;
                const col = String.fromCharCode(65 + c);
                const coordStr = `${col}${r + 1}`;
                return (
                  <li key={i}>
                    <span className="t">{myShots.length - i}</span>
                    <span className="who me">YOU</span>
                    <span>{coordStr}</span>
                    <span className={`res ${entry.result}`}>{entry.result}</span>
                  </li>
                );
              })}
              {myShots.length === 0 && (
                <li><span style={{ color: "var(--ink-soft)" }}>No moves yet</span></li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT: enemy waters */}
        <div className="board-col">
          <div className="head-row">
            <h3 style={{ textAlign: "right" }}>Enemy waters</h3>
            <FleetStatus ships={botShips} />
          </div>
          <Board
            owner="enemy"
            cellStates={enemyCells}
            onCellClick={isOver ? undefined : (r, c) => shoot(r, c)}
            small
          />
          <p className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "1.5px" }}>
            // {isOver ? "game over" : "click to fire"}
          </p>
        </div>
      </section>

      <div className="control-bar">
        <div className="ctrl-left">
          <Link href="/play" className="btn ghost small">↻ Resign</Link>
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--hit)", letterSpacing: "1.5px" }}>
          ▲ COACH IS RECORDING — patterns being tracked
        </span>
      </div>
    </main>
  );
}
