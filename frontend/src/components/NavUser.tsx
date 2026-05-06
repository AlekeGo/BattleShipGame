"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function NavUser() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link href="/login" className="text-sm text-blue-600 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="max-w-[180px] truncate text-sm">{user.email}</span>
      <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">
        Sign out
      </button>
    </div>
  );
}
