import Link from "next/link";
import CoachReport from "@/components/CoachReport";
import { AppHeader } from "@/components/AppHeader";
import { RouteBar } from "@/components/RouteBar";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const shortId = params.id.slice(0, 8);
  return (
    <main className="page">
      <AppHeader navLinks={[{ href: "/play", label: "New game" }]} />
      <RouteBar path={`game/${shortId}/review`} label="coach report" right="generated · Claude Haiku 4.5" />

      <section className="report-hero">
        <div>
          <p className="meta">POST-GAME REPORT · MATCH {shortId}</p>
          <div className="verdict-bar">
            <span className="stamp green tilt result-stamp">COMPLETE</span>
          </div>
          <h1>Your Coach report<br />is ready.</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span className="sticker">COACH ANALYSIS</span>
        </div>
      </section>

      <CoachReport gameId={params.id} />

      <section className="archetype-bar">
        <div className="actions">
          <Link href="/play" className="btn">Play another →</Link>
          <Link href="/profile" className="btn ghost">See all reports</Link>
        </div>
      </section>
    </main>
  );
}
