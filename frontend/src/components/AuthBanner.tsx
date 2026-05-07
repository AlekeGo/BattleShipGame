"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function AuthBanner() {
  const { user, loading } = useAuth();
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    setHasPlayed(!!localStorage.getItem("bsc_user_id"));
  }, []);

  if (loading || user || !hasPlayed) return null;

  return (
    <div
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 56px 8px 100px",
        borderBottom: "1px dashed rgba(46,31,158,0.3)",
        fontSize: 11,
        letterSpacing: "1.5px",
        color: "var(--ink-soft)",
        background: "var(--paper-2)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <span>// sign in to save your stats across devices</span>
      <Link href="/login" style={{ color: "var(--hit)", textDecoration: "none" }}>
        Sign in →
      </Link>
    </div>
  );
}
