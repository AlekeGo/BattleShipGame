import CoachReport from "@/components/CoachReport";

export default function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Coach Review</h1>
      <CoachReport gameId={params.id} />
    </main>
  );
}
