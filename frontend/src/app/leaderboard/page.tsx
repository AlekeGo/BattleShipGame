"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<LeaderboardRow[]>("/api/leaderboard")
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="mt-4 text-red-600">Could not load leaderboard. Please try again.</p>
      </main>
    );
  }

  if (rows === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="mt-8 space-y-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-32 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (rows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="mt-4 opacity-60">
          No ranked players yet.{" "}
          <Link href="/play" className="underline">
            Play a game
          </Link>{" "}
          and set your region in{" "}
          <Link href="/profile" className="underline">
            Profile
          </Link>{" "}
          to appear here.
        </p>
      </main>
    );
  }

  const grouped = groupByRegion(rows);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      {Array.from(grouped.entries()).map(([region, players]) => (
        <section key={region}>
          <h2 className="text-lg font-semibold mb-3">{region}</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-2 text-left font-medium opacity-60">Rank</th>
                  <th className="px-4 py-2 text-left font-medium opacity-60">Player</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Wins</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Games</th>
                  <th className="px-4 py-2 text-right font-medium opacity-60">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={`${region}-${i}`}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{p.display_name ?? "Anonymous"}</td>
                    <td className="px-4 py-3 text-right">{p.wins}</td>
                    <td className="px-4 py-3 text-right">{p.total_games}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.accuracy_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
