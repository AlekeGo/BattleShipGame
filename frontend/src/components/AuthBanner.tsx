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
    <div className="flex items-center justify-between border-b bg-blue-50 px-6 py-2 text-sm">
      <span>Sign in to save your stats across devices.</span>
      <Link href="/login" className="ml-4 font-medium text-blue-600 hover:underline">
        Sign in →
      </Link>
    </div>
  );
}
