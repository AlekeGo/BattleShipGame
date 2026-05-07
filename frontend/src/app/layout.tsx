import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthBanner } from "@/components/AuthBanner";
import { NavUser } from "@/components/NavUser";

export const metadata: Metadata = {
  title: "Ocean Strike",
  description: "The only Battleship that makes you better at Battleship.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold">
              Ocean Strike
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/play" className="opacity-70 hover:opacity-100 transition-opacity">
                Play
              </Link>
              <Link href="/stats" className="opacity-70 hover:opacity-100 transition-opacity">
                Stats
              </Link>
              <Link href="/leaderboard" className="opacity-70 hover:opacity-100 transition-opacity">
                Leaderboard
              </Link>
              <Link href="/profile" className="opacity-70 hover:opacity-100 transition-opacity">
                Profile
              </Link>
            </nav>
          </div>
          <NavUser />
        </header>
        <AuthBanner />
        {children}
      </body>
    </html>
  );
}
