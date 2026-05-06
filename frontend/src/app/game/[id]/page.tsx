import Board from "@/components/Board";

export default function GamePage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold">Game {params.id}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Your fleet</h2>
          <Board owner="player" />
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Enemy waters</h2>
          <Board owner="enemy" />
        </div>
      </div>
    </main>
  );
}
