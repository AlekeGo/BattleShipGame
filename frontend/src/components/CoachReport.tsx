"use client";

import { useEffect, useState } from "react";

import type { CoachAnalysis } from "@/lib/types";
import { api } from "@/lib/api";

export default function CoachReport({ gameId }: { gameId: string }) {
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);

  useEffect(() => {
    api.post<CoachAnalysis>(`/api/games/${gameId}/analyze`).then(setAnalysis).catch(() => {});
  }, [gameId]);

  if (!analysis) return <p className="mt-6 opacity-70">Analyzing your game…</p>;

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
        <ol className="list-decimal pl-5">
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
