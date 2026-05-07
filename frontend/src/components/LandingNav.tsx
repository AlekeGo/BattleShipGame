"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function LandingNav() {
  const { user, loading, signOut } = useAuth();

  const authSection = loading ? null : user ? (
    <Link href="/profile" className="user-chip" style={{ cursor: "pointer", textDecoration: "none" }}>
      <span className="avatar">{(user.email ?? "?")[0].toUpperCase()}</span>
      <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.email ?? "user"}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); signOut(); }}
        className="mono"
        style={{ fontSize: 11, letterSpacing: "1.5px", color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", marginLeft: 6 }}
      >
        out
      </button>
    </Link>
  ) : (
    <>
      <Link href="/login" className="btn ghost">Sign in</Link>
      <Link href="/play" className="btn">Play free</Link>
    </>
  );

  return (
    <nav className="nav">
      <a href="#coach">The Coach</a>
      <a href="#different">What&apos;s different</a>
      <a href="#roadmap">Roadmap</a>
      <Link href="/leaderboard">Leaderboard</Link>
      {authSection}
    </nav>
  );
}
