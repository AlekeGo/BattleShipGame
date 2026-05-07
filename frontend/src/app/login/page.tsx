"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";

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
    if (authError) { setError(authError.message); return; }
    router.push("/play");
  }

  async function handleGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="page narrow">
      <AppHeader navLinks={[]} rightExtra={<Link href="/" className="small-link">← back to landing</Link>} />

      <section className="login-wrap">
        {/* LEFT: pitch */}
        <div className="login-left">
          <p className="section-eyebrow">SIGN IN OR CREATE ACCOUNT</p>
          <h1>One account.<br />Every <span className="red">report</span>.<br />Every game.</h1>
          <p>Sign in to save your archetype evolution, climb the regional leaderboard, and pick up matches across devices.</p>
          <ul>
            <li>your Coach reports, archived</li>
            <li>your archetype trail, persistent</li>
            <li>regional ranking unlocked</li>
          </ul>
          <div className="quote-card">
            I came for a quick game. The Coach told me I open with J-row 80% of the time. I haven&apos;t slept since.
            <p className="who">— anonymous, match #4,217</p>
          </div>
        </div>

        {/* RIGHT: auth */}
        <div className="login-right">
          <div className="auth-card">
            <div className="tabs">
              <div
                className={`tab${tab === "signin" ? " active" : ""}`}
                onClick={() => setTab("signin")}
              >Sign in</div>
              <div
                className={`tab${tab === "signup" ? " active" : ""}`}
                onClick={() => setTab("signup")}
              >Sign up</div>
            </div>

            <button className="oauth-btn" onClick={handleGoogle} type="button">
              <svg className="g" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.3c-.4.4 6.4-4.7 6.4-14.9 0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </button>

            <div className="divider">OR WITH EMAIL</div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>EMAIL</label>
                <input className="input" type="email" required placeholder="commander@oceanstrike.io" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <input className="input" type="password" required minLength={6} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>

              {error && <p className="mono" style={{ fontSize: 12, color: "var(--hit)", marginBottom: 12 }}>{error}</p>}

              <div className="submit-row">
                <span className="small-link" style={{ cursor: "default" }}>
                  {tab === "signin" ? "New here? Switch to Sign up" : "Already have an account?"}
                </span>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? "Loading…" : tab === "signin" ? "Sign in →" : "Sign up →"}
                </button>
              </div>
            </form>

            <p className="legal">
              By signing in you agree to our terms and privacy policy.<br />
              We don&apos;t sell your moves. The Coach analyzes them on Claude Haiku, then forgets.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
