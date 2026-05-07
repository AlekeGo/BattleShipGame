"use client";

import { useEffect, useState } from "react";

import type { CoachAnalysis } from "@/lib/types";
import { api } from "@/lib/api";

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-slate-200 dark:bg-slate-700"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export default function CoachReport({ gameId }: { gameId: string }) {
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .post<CoachAnalysis>(`/api/games/${gameId}/analyze`)
      .then(setAnalysis)
      .catch(() => setError(true));
  }, [gameId]);

  if (error) {
    return (
      <p className="mt-6 text-red-600">
        Could not load coach analysis. Please try again later.
      </p>
    );
  }

  if (!analysis) {
    return (
      <div className="mt-6 space-y-8">
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Archetype</p>
          <Skeleton lines={1} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Top mistake</p>
          <Skeleton lines={2} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">Tips</p>
          <Skeleton lines={3} />
        </section>
        <section className="space-y-2">
          <p className="text-sm uppercase opacity-60">What you did well</p>
          <Skeleton lines={2} />
        </section>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section>
        <p className="text-sm uppercase opacity-60">Archetype</p>
        <p className="text-2xl font-semibold">{analysis.archetype}</p>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">Top mistake</p>
        <p>{analysis.top_mistake}</p>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">Tips</p>
        <ol className="list-decimal pl-5 space-y-1">
          {analysis.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>
      <section>
        <p className="text-sm uppercase opacity-60">What you did well</p>
        <p>{analysis.did_well}</p>
      </section>
    </div>
  );
}
