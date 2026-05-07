"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user";
import { AppHeader } from "@/components/AppHeader";
import { RouteBar } from "@/components/RouteBar";

type UserRecord = { id: string; display_name: string | null; region: string | null; email: string | null };
type ArchetypeEntry = { game_id: string; archetype: string | null; ended_at: string | null; won: boolean };
type StatsData = { total_games: number; wins: number; win_rate: number; accuracy_pct: number; streak: number; archetypes: ArchetypeEntry[] };

const REGIONS = ["Central Asia","Europe — West","Europe — East","North America","South America","Asia — East","Asia — South","Oceania","Africa"];

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
      } catch { setError(true); } finally { setLoading(false); }
    });
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false); setSaveError(false);
    try {
      const uid = await getOrCreateUserId();
      await api.patch(`/api/users/${uid}/profile`, { display_name: displayName || null, region: region || null });
      setSaved(true);
    } catch { setSaveError(true); } finally { setSaving(false); }
  }

  return (
    <main className="page">
      <AppHeader />
      <RouteBar path="profile" label="identity + stats" />

      {loading && (
        <section className="two-col" style={{ paddingTop: 32 }}>
          <div><div className="skeleton" style={{ height: 200 }} /></div>
          <div>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ marginBottom: 12 }} />)}
          </div>
        </section>
      )}

      {error && (
        <section style={{ padding: "40px 100px" }}>
          <div className="hd-card tilt-l">
            <p className="hand" style={{ fontSize: 24, color: "var(--hit)" }}>Could not load profile. Please try again.</p>
          </div>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="profile-hero">
            <div className="portrait">
              <div className="corners" />
              <div className="ph">◌<br />AVATAR<br />HERE</div>
            </div>
            <div>
              <p className="section-eyebrow">CALL SIGN</p>
              <h1>{displayName || "Commander"}</h1>
              <p className="handle">@{displayName?.toLowerCase().replace(/\s+/g, "") || "anonymous"} · {region || "no region"}</p>
              <div className="badges">
                {stats?.archetypes?.[stats.archetypes.length - 1]?.archetype && (
                  <span className="sticker">{stats.archetypes[stats.archetypes.length - 1].archetype}</span>
                )}
                <span className="mono" style={{ fontSize: 13, color: "var(--ink-soft)", letterSpacing: "1.5px" }}>
                  // {stats?.total_games ?? 0} games · {stats?.wins ?? 0} W / {(stats?.total_games ?? 0) - (stats?.wins ?? 0)} L
                </span>
              </div>
            </div>
          </section>

          <section className="two-col">
            {/* LEFT: form */}
            <div>
              <p className="section-eyebrow" style={{ marginBottom: 10 }}>YOUR IDENTITY</p>
              <div className="form-card">
                <h3>EDIT PROFILE</h3>
                <p className="help">Display name and region appear on the public leaderboard. A region is required to be ranked.</p>

                <div className="field">
                  <label>DISPLAY NAME</label>
                  <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. AdmiralRustam" maxLength={50} />
                </div>
                <div className="field">
                  <label>REGION <span className="mono" style={{ fontSize: 10, color: "var(--hit)" }}>· REQUIRED</span></label>
                  <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
                    <option value="">— pick region —</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="row">
                  <span className="saved-tag">
                    {saved ? "✓ saved" : saveError ? "✗ save failed" : ""}
                  </span>
                  <button className="btn small" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: stats */}
            <div>
              <p className="section-eyebrow" style={{ marginBottom: 10 }}>YOUR STATS</p>

              {stats && stats.total_games > 0 ? (
                <>
                  <div className="stats-summary">
                    <div className="stat-tile">
                      <p className="label">WIN RATE</p>
                      <p className="num">{stats.win_rate}<small>%</small></p>
                    </div>
                    <div className="stat-tile">
                      <p className="label">ACCURACY</p>
                      <p className="num">{stats.accuracy_pct}<small>%</small></p>
                    </div>
                    <div className="stat-tile">
                      <p className="label">WIN STREAK</p>
                      <p className="num">{stats.streak}</p>
                    </div>
                    <div className="stat-tile">
                      <p className="label">TOTAL GAMES</p>
                      <p className="num">{stats.total_games}</p>
                    </div>
                  </div>

                  {stats.archetypes.length > 0 && (
                    <div className="archetype-section">
                      <h3>Archetype evolution</h3>
                      <p className="sub">LAST 10 GAMES · CLICK ANY PILL FOR THAT MATCH&apos;S COACH REPORT</p>
                      <div className="arch-pills">
                        {stats.archetypes.map((entry, i) => (
                          <Link
                            key={entry.game_id}
                            href={`/game/${entry.game_id}/review`}
                            className={`arch-pill${i === stats.archetypes.length - 1 ? " now" : ""}`}
                          >
                            {entry.archetype ?? "…"}
                            <span className="when">#{i + 1}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="section-eyebrow" style={{ marginTop: 24 }}>RECENT MATCHES</p>
                  <ul className="recent-list">
                    {stats.archetypes.slice(-4).reverse().map((entry) => (
                      <Link key={entry.game_id} href={`/game/${entry.game_id}/review`}>
                        <li>
                          <span className="id">#{entry.game_id.slice(0, 6)}</span>
                          <span>{entry.ended_at ? new Date(entry.ended_at).toLocaleDateString() : "—"}</span>
                          <span className="arch">{entry.archetype ?? "—"}</span>
                          <span className={`res ${entry.won ? "win" : "loss"}`}>{entry.won ? "W" : "L"}</span>
                        </li>
                      </Link>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="hd-card tilt-r">
                  <p className="hand" style={{ fontSize: 24, color: "var(--ink-dark)", margin: "0 0 8px" }}>No games yet.</p>
                  <p className="body-hand" style={{ color: "var(--ink-soft)", margin: 0 }}>
                    <Link href="/play" className="small-link">Play your first game →</Link>
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
