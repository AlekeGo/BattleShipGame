"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } =
      tab === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/play");
  }

  async function handleGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-8 text-3xl font-bold">Ocean Strike</h1>

      <div className="mb-6 flex border-b">
        <button
          className={`px-4 pb-2 ${tab === "signin" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setTab("signin")}
        >
          Sign In
        </button>
        <button
          className={`px-4 pb-2 ${tab === "signup" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setTab("signup")}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : tab === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 border-t" />
        <span className="text-sm text-gray-500">or</span>
        <div className="flex-1 border-t" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </main>
  );
}
