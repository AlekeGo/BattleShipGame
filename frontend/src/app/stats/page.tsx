"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";

type ArchetypeEntry = {
  game_id: string;
  archetype: string | null;
  ended_at: string | null;
  won: boolean;
};

type StatsData = {
  total_games: number;
  wins: number;
  win_rate: number;
  accuracy_pct: number;
  streak: number;
  archetypes: ArchetypeEntry[];
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide opacity-50">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-sm opacity-60">{sub}</p>}
    </div>
  );
}

const ARCHETYPE_COLOR: Record<string, string> = {
  "Random Shooter": "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  "Aggressive Hunter": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  "Methodical Planner": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  "Defensive Placer": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  "Pattern-Locked": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getOrCreateUserId()
      .then((uid) => api.get<StatsData>(`/api/users/${uid}/stats`))
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">My Stats</h1>
        <p className="mt-4 text-red-600">Could not load stats. Please try again.</p>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">My Stats</h1>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </main>
    );
  }

  if (stats.total_games === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">My Stats</h1>
        <p className="mt-4 opacity-60">
          No games yet.{" "}
          <Link href="/play" className="underline">
            Play your first game
          </Link>{" "}
          to see stats here.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">My Stats</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Win rate"
          value={`${stats.win_rate}%`}
          sub={`${stats.wins} / ${stats.total_games} games`}
        />
        <StatCard label="Accuracy" value={`${stats.accuracy_pct}%`} sub="shots on target" />
        <StatCard
          label="Win streak"
          value={String(stats.streak)}
          sub={stats.streak === 1 ? "game" : "games"}
        />
        <StatCard label="Total games" value={String(stats.total_games)} />
      </div>

      {stats.archetypes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Archetype evolution (last 10 games)</h2>
          <div className="flex flex-wrap gap-2">
            {stats.archetypes.map((entry, i) => (
              <Link
                key={entry.game_id}
                href={`/game/${entry.game_id}/review`}
                title={entry.ended_at ? new Date(entry.ended_at).toLocaleDateString() : ""}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-opacity hover:opacity-80 ${
                  entry.archetype
                    ? (ARCHETYPE_COLOR[entry.archetype] ?? "bg-slate-200 text-slate-800")
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${entry.won ? "bg-green-500" : "bg-red-400"}`}
                />
                {entry.archetype ?? "Pending…"}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-40">Oldest → newest. Click any pill to see the Coach report.</p>
        </section>
      )}
    </main>
  );
}
