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
          <Link href="/" className="font-bold">
            Ocean Strike
          </Link>
          <NavUser />
        </header>
        <AuthBanner />
        {children}
      </body>
    </html>
  );
}
