import Link from "next/link";

const DEMO_ROWS: string[][] = [
  ["","miss","","","","","","","","miss"],
  ["","","","hit","","","miss","","",""],
  ["miss","","","hit","","","","","","miss"],
  ["","","","hit","","","","miss","",""],
  ["","miss","","","","","","","",""],
  ["","","","","","sunk","sunk","sunk","",""],
  ["","","miss","","","","","","",""],
  ["","","","","","","","","miss",""],
  ["","","","","miss","","","","",""],
  ["","","","","","","miss","","",""],
];

const COLS = ["A","B","C","D","E","F","G","H","I","J"];

export default function LandingPage() {
  return (
    <main className="page">
      {/* TOP STRIP */}
      <header className="top-strip">
        <div className="wordmark">
          <svg style={{ display: "inline-block", width: 30, height: 30, marginRight: 6, verticalAlign: "-5px" }} viewBox="0 0 32 32" aria-hidden="true">
            <g fill="none" stroke="#2e1f9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#rough)">
              <circle cx="16" cy="6" r="3" /><line x1="16" y1="9" x2="16" y2="27" />
              <line x1="11" y1="13" x2="21" y2="13" /><path d="M6 22 Q16 30 26 22" />
            </g>
          </svg>
          Ocean Strike
        </div>
        <nav className="nav">
          <a href="#coach">The Coach</a>
          <a href="#different">What&apos;s different</a>
          <a href="#roadmap">Roadmap</a>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/login" className="btn ghost">Sign in</Link>
          <Link href="/play" className="btn">Play free</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 16 }}>v0.4 · BROWSER · NO SIGN-UP</p>
          <h1>
            The only <span className="red-strike">Battleship</span><br />
            that makes&nbsp;you<br />
            <span className="ink-strike">better</span> at Battleship.
          </h1>
          <p className="tagline">
            LLM-powered Battleship with a post-game <em>Coach</em> that reads your moves
            like a textbook and tells you, plainly, what you keep getting wrong.
          </p>
          <div className="cta-row">
            <Link href="/play" className="btn">Start a game →</Link>
            <a href="#coach" className="btn ghost">See the Coach</a>
            <span className="meta-note">no ads, no paywall on the core loop</span>
          </div>
        </div>

        <div className="hero-board-wrap">
          <span className="stamp" style={{ position: "absolute", top: -28, right: -10, transform: "rotate(8deg)", zIndex: 5 }}>DEMO BOARD</span>
          <div className="grid-board" aria-hidden="true">
            <div className="corner" />
            {COLS.map(c => <div key={c} className="col-h">{c}</div>)}
            {DEMO_ROWS.flatMap((row, ri) => [
              <div key={`rh${ri}`} className="row-h">{ri + 1}</div>,
              ...row.map((cls, ci) => (
                <div key={`${ri},${ci}`} className={`cell${cls ? ` ${cls}` : ""}`} />
              )),
            ])}
          </div>
          <div className="coach-callout bottom-left">
            You shot D2-D3-D4 in a straight line. Predictable.
            Try a knight-move follow-up next time.
          </div>
        </div>
      </section>

      {/* COACH SECTION */}
      <section className="section" id="coach">
        <div className="coach-section">
          <div className="coach-copy">
            <p className="section-eyebrow">THE DIFFERENTIATOR</p>
            <h2>A coach that <span className="underline">cites</span><br />your actual moves.</h2>
            <p>
              Most game AIs give you generic tips. Ocean Strike&apos;s Coach reads
              every shot you made — sequence, timing, density — and writes you
              a one-page report after each match.
            </p>
            <p>
              It tracks <span className="term">shot entropy</span>,{" "}
              <span className="term">parity discipline</span>,{" "}
              <span className="term">post-hit follow-through</span>, and{" "}
              <span className="term">placement tendencies</span>.
            </p>
            <p style={{ fontFamily: "'Special Elite', monospace", fontSize: 14, color: "var(--ink-soft)", maxWidth: 440 }}>
              // Built on Claude Haiku 4.5. Your moves stay yours.
            </p>
          </div>
          <div className="coach-card">
            <div className="tape" />
            <h3>POST-GAME REPORT · MATCH #027</h3>
            <p className="verdict">
              You played like a <span className="hl">methodical hunter</span> — but you flinched after every hit.
            </p>
            <div className="stat-row"><span>shot entropy</span><span className="val good">0.81</span></div>
            <div className="stat-row"><span>parity discipline</span><span className="val good">94%</span></div>
            <div className="stat-row"><span>post-hit follow-through</span><span className="val bad">41%</span></div>
            <div className="stat-row"><span>avg. wasted shots</span><span className="val bad">6.3</span></div>
            <div className="quote">
              On turn 14 you hit D2. Instead of pressing D1 or D3 you fired G7.
              You did this in 3 of your last 4 games. Commit to the kill.
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S DIFFERENT */}
      <section className="section" id="different">
        <p className="section-eyebrow">WHAT&apos;S DIFFERENT</p>
        <h2>Three things <span className="underline">no one else</span> is doing.</h2>
        <div className="diff-grid" style={{ marginTop: 32 }}>
          <article className="diff-card">
            <p className="num">01</p>
            <h4>No ads. No paywalls on the core loop.</h4>
            <p>You came to play Battleship. The core game, the Coach report, all grids — free, forever.</p>
          </article>
          <article className="diff-card">
            <p className="num">02</p>
            <h4>The Coach cites your actual moves.</h4>
            <p>Not &quot;play more strategically.&quot; It quotes the exact turn so you can replay and learn.</p>
          </article>
          <article className="diff-card">
            <p className="num">03</p>
            <h4>You evolve. An archetype emerges.</h4>
            <p>Across matches your stats compound into an archetype — Sniper, Sweeper, Brawler, Recluse.</p>
          </article>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="section" id="roadmap">
        <p className="section-eyebrow">SHIPPING NEXT</p>
        <h2>The <span className="underline">roadmap</span>, on graph paper.</h2>
        <div className="roadmap">
          <div className="roadmap-track">
            <div className="roadmap-stops">
              {[
                { when: "NOW · v0.4", title: "Solo + Coach", desc: "Single-player, full post-game report, archetype tracking.", now: true },
                { when: "Q3 2026", title: "Multiplayer by link", desc: "WebSocket rooms — share a URL, play a friend.", now: false },
                { when: "Q4 2026", title: "3-Minute Blitz", desc: "Speed mode with a shot clock.", now: false },
                { when: "Q1 2027", title: "School Tournaments", desc: "Bracket mode for classrooms. Free for educators.", now: false },
                { when: "LATER", title: "Coach Pro", desc: "Per-move analysis, custom skins, deep analytics.", now: false },
              ].map((s) => (
                <div key={s.when} className={`stop${s.now ? " now" : ""}`}>
                  <div className="pin" />
                  <p className="when">{s.when}</p>
                  <h5>{s.title}</h5>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLAY STRIP */}
      <section className="play-strip">
        <h3>Your <span className="red">D2-D3-D4</span> habit isn&apos;t going to fix itself.</h3>
        <p>One game takes ~6 minutes. The Coach report, ~20 seconds to read. No sign-up. No download.</p>
        <Link href="/play" className="btn" style={{ background: "#ff6068", boxShadow: "2px 3px 0 #000" }}>
          Play Ocean Strike →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <div className="wordmark-foot">⚓ Ocean Strike</div>
          <p style={{ fontFamily: "'Kalam', cursive", fontSize: 15, margin: "0 0 10px", maxWidth: 320 }}>
            A small, independent game studio. Battleship, but it teaches.
          </p>
          <p className="colophon">// built on graph paper.<br />// made by two people, a cat, and a kettle.</p>
        </div>
        <div>
          <h6>THE GAME</h6>
          <Link href="/play">Play now</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/login">Sign in</Link>
          <a href="#coach">Meet the Coach</a>
          <a href="#roadmap">Roadmap</a>
        </div>
        <div>
          <h6>ELSEWHERE</h6>
          <a href="#">Devlog</a>
          <a href="#">GitHub</a>
          <a href="#">Email us</a>
        </div>
      </footer>
    </main>
  );
}
