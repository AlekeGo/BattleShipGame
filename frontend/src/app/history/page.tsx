"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";

type GameSummary = {
  game_id: string;
  mode: string;
  status: string;
  winner: string | null;
  accuracy_pct: number | null;
  archetype: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type HistoryData = {
  games: GameSummary[];
  offset: number;
  limit: number;
};

const MODE_LABEL: Record<string, string> = {
  pvbot_easy: "vs Bot (Easy)",
  pvbot_medium: "vs Bot (Medium)",
  pvbot_hard: "vs Bot (Hard)",
  hotseat: "Hot-seat",
};

function resultLabel(g: GameSummary) {
  if (g.status !== "finished") return { text: "In progress", cls: "text-yellow-600" };
  if (g.winner === "player") return { text: "Won", cls: "text-green-600" };
  return { text: "Lost", cls: "text-red-500" };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);
  const limit = 20;

  useEffect(() => {
    setData(null);
    setError(false);
    getOrCreateUserId()
      .then((uid) =>
        api.get<HistoryData>(`/api/users/${uid}/games?limit=${limit}&offset=${offset}`)
      )
      .then(setData)
      .catch(() => setError(true));
  }, [offset]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="mt-4 text-red-600">Could not load history. Please try again.</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">History</h1>
        <div className="mt-6 space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </main>
    );
  }

  if (data.games.length === 0 && offset === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="mt-4 opacity-60">
          No games yet.{" "}
          <Link href="/play" className="underline">
            Play your first game
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">History</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide opacity-60">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-left">Accuracy</th>
              <th className="px-4 py-3 text-left">Archetype</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.games.map((g) => {
              const res = resultLabel(g);
              return (
                <tr key={g.game_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 opacity-70">{formatDate(g.ended_at ?? g.started_at)}</td>
                  <td className="px-4 py-3">{MODE_LABEL[g.mode] ?? g.mode}</td>
                  <td className={`px-4 py-3 font-medium ${res.cls}`}>{res.text}</td>
                  <td className="px-4 py-3 opacity-70">
                    {g.accuracy_pct !== null ? `${g.accuracy_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 opacity-70">{g.archetype ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {g.status === "finished" && (
                      <Link
                        href={`/game/${g.game_id}/review`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                      >
                        Coach report →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          disabled={offset === 0}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          ← Previous
        </button>
        <span className="opacity-50">Showing {offset + 1}–{offset + data.games.length}</span>
        <button
          onClick={() => setOffset((o) => o + limit)}
          disabled={data.games.length < limit}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Next →
        </button>
      </div>
    </main>
  );
}
