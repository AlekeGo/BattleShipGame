"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";

type UserRecord = {
  id: string;
  display_name: string | null;
  region: string | null;
  email: string | null;
};

type StatsData = {
  total_games: number;
  wins: number;
  win_rate: number;
  accuracy_pct: number;
  streak: number;
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    getOrCreateUserId().then(async (uid) => {
      try {
        const [userRes, statsRes] = await Promise.all([
          api.get<UserRecord>(`/api/users/${uid}`),
          api.get<StatsData>(`/api/users/${uid}/stats`),
        ]);
        setDisplayName(userRes.display_name ?? "");
        setRegion(userRes.region ?? "");
        setStats(statsRes);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const uid = await getOrCreateUserId();
      await api.patch(`/api/users/${uid}/profile`, {
        display_name: displayName || null,
        region: region || null,
      });
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-4 text-red-600">Could not load profile. Please try again.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Profile</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your identity</h2>
        <p className="text-sm opacity-60">
          Set your display name and region to appear on the{" "}
          <Link href="/leaderboard" className="underline">
            leaderboard
          </Link>
          .
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Captain Almaty"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <input
              type="text"
              maxLength={50}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Almaty, KZ"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          {saveError && <span className="text-sm text-red-600">Save failed. Try again.</span>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your stats</h2>
        {stats && stats.total_games > 0 ? (
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
        ) : (
          <p className="text-sm opacity-60">
            No games yet.{" "}
            <Link href="/play" className="underline">
              Play your first game
            </Link>{" "}
            to see stats here.
          </p>
        )}
      </section>
    </main>
  );
}
