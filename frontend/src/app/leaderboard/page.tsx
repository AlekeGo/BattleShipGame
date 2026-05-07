"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { RouteBar } from "@/components/RouteBar";

type LeaderboardRow = {
  region: string;
  display_name: string | null;
  wins: number;
  total_games: number;
  accuracy_pct: number;
};

function groupByRegion(rows: LeaderboardRow[]): Map<string, LeaderboardRow[]> {
  const map = new Map<string, LeaderboardRow[]>();
  for (const row of rows) {
    const group = map.get(row.region) ?? [];
    group.push(row);
    map.set(row.region, group);
  }
  return map;
}

const RANK_CLASS = ["gold", "silver", "bronze"];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<LeaderboardRow[]>("/api/leaderboard").then(setRows).catch(() => setError(true));
  }, []);

  return (
    <main className="page">
      <AppHeader />
      <RouteBar path="leaderboard" label="ranked by accuracy" right="updated · just now" />

      <section className="lb-hero">
        <div>
          <p className="section-eyebrow">THE WALL</p>
          <h1>Who actually <span style={{ color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--ink)", textDecorationThickness: 5, textUnderlineOffset: 6 }}>aims</span>.</h1>
          <p>Ranked by accuracy, not games played. Bring your region or stay invisible.</p>
        </div>
      </section>

      <div className="filter-bar">
        <span>FILTER:</span>
        <div className="pill-set">
          <span className="pill active">All time</span>
          <span className="pill">This month</span>
          <span className="pill">This week</span>
        </div>
        <span style={{ marginLeft: "auto" }}>SORT:</span>
        <div className="pill-set">
          <span className="pill active">Accuracy</span>
          <span className="pill">Win rate</span>
        </div>
      </div>

      {error && (
        <section className="regions">
          <div className="hd-card tilt-l" style={{ textAlign: "center", padding: "28px 20px" }}>
            <p className="hand" style={{ fontSize: 28, color: "var(--hit)", margin: 0 }}>Could not load leaderboard.</p>
          </div>
        </section>
      )}

      {rows === null && !error && (
        <section className="regions">
          {[1, 2].map(i => (
            <div key={i} className="region">
              <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "100%", height: 120 }} />
            </div>
          ))}
        </section>
      )}

      {rows !== null && rows.length === 0 && (
        <section className="regions">
          <div className="hd-card tilt-l" style={{ textAlign: "center", padding: "28px 20px" }}>
            <p className="hand" style={{ fontSize: 30, fontWeight: 700, color: "var(--ink-dark)", margin: "0 0 6px", lineHeight: 1 }}>Be the first.</p>
            <p className="body-hand" style={{ fontSize: 16, color: "var(--ink-dark)", margin: "0 0 16px" }}>No ranked players yet. Play a game and set your region in Profile to appear here.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/play" className="btn small">Play a ranked game</Link>
              <Link href="/profile" className="btn ghost small">Set your region</Link>
            </div>
          </div>
        </section>
      )}

      {rows !== null && rows.length > 0 && (
        <section className="regions">
          {Array.from(groupByRegion(rows).entries()).map(([region, players]) => {
            const leader = players[0];
            return (
              <div key={region} className="region">
                <h2>{region} <span className="count">· {players.length} ranked players</span></h2>
                <p className="lead">LEADER: <strong style={{ color: "var(--ink)" }}>{leader.display_name ?? "Anonymous"}</strong> · {leader.accuracy_pct}% accuracy</p>
                <table className="lb">
                  <thead>
                    <tr><th>#</th><th>PLAYER</th><th>GAMES</th><th style={{ textAlign: "right" }}>ACC</th></tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr key={i} className={RANK_CLASS[i] ?? ""}>
                        <td className="rank">{i + 1}</td>
                        <td className="player">
                          <span className="av">{(p.display_name ?? "?")[0].toUpperCase()}</span>
                          {p.display_name ?? "Anonymous"}
                        </td>
                        <td>{p.total_games}</td>
                        <td className="acc">{p.accuracy_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
