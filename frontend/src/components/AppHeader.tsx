"use client";

import Link from "next/link";
import { NavUser } from "./NavUser";

const AnchorSVG = () => (
  <svg className="anchor" viewBox="0 0 32 32" aria-hidden="true" style={{ width: 30, height: 30, marginRight: 6, verticalAlign: "-5px", display: "inline-block" }}>
    <g fill="none" stroke="#2e1f9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#rough)">
      <circle cx="16" cy="6" r="3" />
      <line x1="16" y1="9" x2="16" y2="27" />
      <line x1="11" y1="13" x2="21" y2="13" />
      <path d="M6 22 Q16 30 26 22" />
    </g>
  </svg>
);

export function AppHeader({
  navLinks,
  rightExtra,
}: {
  navLinks?: { href: string; label: string }[];
  rightExtra?: React.ReactNode;
}) {
  const links = navLinks ?? [
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/play", label: "New game" },
  ];

  return (
    <header className="app-header">
      <Link href="/" className="wordmark">
        <AnchorSVG />
        Ocean Strike
      </Link>
      <nav className="right">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        {rightExtra}
        <NavUser />
      </nav>
    </header>
  );
}
