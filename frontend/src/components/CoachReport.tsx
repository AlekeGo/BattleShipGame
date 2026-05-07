"use client";

import { useEffect, useState } from "react";
import type { CoachAnalysis } from "@/lib/types";
import { api } from "@/lib/api";

function SkeletonBlock() {
  return (
    <div>
      <div className="skeleton" style={{ width: "100%" }} />
      <div className="skeleton" style={{ width: "80%" }} />
      <div className="skeleton" style={{ width: "60%" }} />
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
      <div className="report-grid">
        <div className="hd-card tilt-l" style={{ textAlign: "center", padding: "32px 24px" }}>
          <p className="hand" style={{ fontSize: 28, color: "var(--hit)", margin: 0 }}>Coach is unavailable</p>
          <p className="body-hand" style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 8 }}>Could not load analysis. Try again later.</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="report-grid">
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 8 }}>TOP MISTAKE</p>
          <div className="top-mistake">
            <h3>ANALYSING YOUR MOVES...</h3>
            <SkeletonBlock />
          </div>
          <div className="one-win" style={{ marginTop: 22 }}>
            <h4>ONE THING YOU DID WELL</h4>
            <SkeletonBlock />
          </div>
        </div>
        <div>
          <div className="stats-card">
            <h3>BEHAVIOURAL READOUT</h3>
            <SkeletonBlock />
          </div>
          <p className="section-eyebrow" style={{ margin: "22px 0 10px" }}>3 TIPS, IN ORDER OF RETURN</p>
          <div style={{ display: "grid", gap: 14 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="tip">
                <div className="num">{n}</div>
                <SkeletonBlock />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-grid">
      <div>
        <p className="section-eyebrow" style={{ marginBottom: 8 }}>TOP MISTAKE</p>
        <div className="top-mistake">
          <h3>THE ONE THING TO FIX</h3>
          <p className="verdict">{analysis.top_mistake}</p>
        </div>
        <div className="one-win">
          <h4>ONE THING YOU DID WELL</h4>
          <p>{analysis.did_well}</p>
        </div>
      </div>
      <div>
        <div className="stats-card">
          <h3>YOUR ARCHETYPE</h3>
          <p className="hand" style={{ fontSize: 42, fontWeight: 700, color: "var(--ink)", margin: "8px 0 0", lineHeight: 1 }}>
            {analysis.archetype}
          </p>
        </div>
        <p className="section-eyebrow" style={{ margin: "22px 0 10px" }}>3 TIPS, IN ORDER OF RETURN</p>
        <ol className="tips-list">
          {analysis.tips.map((tip, i) => (
            <li key={i} className="tip">
              <div className="num">{i + 1}</div>
              <div>
                <p>{tip}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
