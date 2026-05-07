"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ShipPlacer from "@/components/ShipPlacer";
import { AppHeader } from "@/components/AppHeader";
import { RouteBar } from "@/components/RouteBar";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";
import type { GameMode } from "@/lib/types";
import type { PlacedShip } from "@/hooks/usePlacement";

const MODES: { value: GameMode; name: string; stars: string; desc: string }[] = [
  { value: "pvbot_easy", name: "Easy", stars: "★ ☆ ☆", desc: "RANDOM SHOTS" },
  { value: "pvbot_medium", name: "Medium", stars: "★ ★ ☆", desc: "HUNT + TARGET" },
  { value: "pvbot_hard", name: "Hard", stars: "★ ★ ★", desc: "PROBABILITY MAP" },
  { value: "hotseat", name: "Hot-seat", stars: "2 PLAYERS", desc: "SAME DEVICE" },
];

const FLEET_CHECKLIST = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

export default function PlayPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("pvbot_medium");
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startNewGame() {
    setLoading(true);
    setError(null);
    try {
      const userId = await getOrCreateUserId();
      const { game_id } = await api.post<{ game_id: string; fleet: unknown[] }>("/api/games", {
        user_id: userId,
        mode,
      });
      setGameId(game_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoPlace() {
    if (!gameId) return;
    try {
      await api.post(`/api/games/${gameId}/place-auto`);
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleConfirm(ships: PlacedShip[]) {
    if (!gameId) return;
    setLoading(true);
    try {
      await api.post(`/api/games/${gameId}/place`, { ships });
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (gameId) {
    return (
      <main className="page">
        <AppHeader />
        <RouteBar path="play" label="new game setup" right="step 2 / 2 — placement" />

        <div className="play-grid">
          {/* LEFT: mode + checklist */}
          <section>
            <p className="section-eyebrow" style={{ marginBottom: 10 }}>PICK YOUR OPPONENT</p>
            <h2 className="hand" style={{ fontWeight: 700, fontSize: 42, lineHeight: 1, margin: "0 0 18px", color: "var(--ink-dark)" }}>
              Who are we sinking today?
            </h2>

            <div className="mode-row">
              {MODES.map((m) => (
                <div
                  key={m.value}
                  className={`mode-card${mode === m.value ? " selected" : ""}`}
                  onClick={() => setMode(m.value)}
                >
                  <div className="mode-name">{m.name}</div>
                  <div className="mode-stars" style={m.value === "hotseat" ? { fontFamily: "'Special Elite', monospace", fontSize: 11, letterSpacing: "1.5px", color: "var(--ink-soft)" } : undefined}>{m.stars}</div>
                  <div className="mode-desc">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="hd-card tilt-l" style={{ marginTop: 24 }}>
              <p className="section-eyebrow" style={{ margin: "0 0 4px" }}>LOADOUT</p>
              <p className="hand" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--ink-dark)", margin: "0 0 6px" }}>Standard fleet</p>
              <p className="body-hand" style={{ fontSize: 15, margin: "0 0 12px", color: "var(--ink-soft)" }}>5 ships · 17 cells · classic 10×10</p>
              <ul className="checklist">
                {FLEET_CHECKLIST.map((s) => (
                  <li key={s.name} className="done">
                    <span className="box" />
                    <span>{s.name} <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>— {s.size} cells</span></span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 18, letterSpacing: "1px" }}>
              // tip: the Coach scores your placement entropy. clusters get punished.
            </p>
          </section>

          {/* RIGHT: placement board */}
          <ShipPlacer onConfirm={handleConfirm} onAutoPlace={handleAutoPlace} />
        </div>

        <div className="footer-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" className="btn ghost small">← back</Link>
            <button className="btn ghost" onClick={handleAutoPlace}>⚄ Auto-place</button>
            <button className="btn ghost" onClick={() => setGameId(null)}>↺ New game</button>
          </div>
          {error && <span className="mono" style={{ fontSize: 12, color: "var(--hit)" }}>{error}</span>}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <AppHeader />
      <RouteBar path="play" label="new game setup" right="step 1 / 2 — mode select" />

      <div className="play-grid">
        <section>
          <p className="section-eyebrow" style={{ marginBottom: 10 }}>PICK YOUR OPPONENT</p>
          <h2 className="hand" style={{ fontWeight: 700, fontSize: 42, lineHeight: 1, margin: "0 0 18px", color: "var(--ink-dark)" }}>
            Who are we sinking today?
          </h2>

          <div className="mode-row">
            {MODES.map((m) => (
              <div
                key={m.value}
                className={`mode-card${mode === m.value ? " selected" : ""}`}
                onClick={() => setMode(m.value)}
              >
                <div className="mode-name">{m.name}</div>
                <div className="mode-stars" style={m.value === "hotseat" ? { fontFamily: "'Special Elite', monospace", fontSize: 11, letterSpacing: "1.5px", color: "var(--ink-soft)" } : undefined}>{m.stars}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>

          {error && <p className="mono" style={{ fontSize: 12, color: "var(--hit)", marginTop: 12 }}>{error}</p>}
        </section>

        <section style={{ paddingTop: 40 }}>
          <div className="hd-card tilt-l">
            <p className="section-eyebrow" style={{ margin: "0 0 4px" }}>LOADOUT</p>
            <p className="hand" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--ink-dark)", margin: "0 0 6px" }}>Standard fleet</p>
            <p className="body-hand" style={{ fontSize: 15, margin: "0 0 12px", color: "var(--ink-soft)" }}>5 ships · 17 cells · classic 10×10</p>
            <ul className="checklist">
              {FLEET_CHECKLIST.map((s) => (
                <li key={s.name}>
                  <span className="box" />
                  <span>{s.name} <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>— {s.size} cells</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="footer-bar">
        <Link href="/" className="btn ghost small">← back</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="btn big"
            onClick={startNewGame}
            disabled={loading}
          >
            {loading ? "Starting…" : "Set sail →"}
          </button>
        </div>
      </div>
    </main>
  );
}
