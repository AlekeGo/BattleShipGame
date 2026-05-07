"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function NavUser() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link href="/login" className="small-link">
        Sign in
      </Link>
    );
  }

  const initial = (user.email ?? "?")[0].toUpperCase();
  const display = user.email ?? "user";

  return (
    <span className="user-chip" style={{ cursor: "default" }}>
      <span className="avatar">{initial}</span>
      <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {display}
      </span>
      <button
        onClick={signOut}
        className="mono"
        style={{ fontSize: 11, letterSpacing: "1.5px", color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", marginLeft: 6 }}
      >
        out
      </button>
    </span>
  );
}
