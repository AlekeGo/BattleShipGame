import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold">Ocean Strike</h1>
      <p className="mt-4 text-lg opacity-80">
        The only Battleship that makes you better at Battleship.
      </p>
      <Link
        href="/play"
        className="mt-8 inline-block rounded-md bg-blue-600 px-6 py-3 text-white"
      >
        Play
      </Link>
    </main>
  );
}
