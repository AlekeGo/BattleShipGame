"use client";

import { useState } from "react";

export default function PlayPage() {
  const [mode, setMode] = useState<"pvbot_easy" | "pvbot_medium" | "pvbot_hard" | "hotseat">(
    "pvbot_medium",
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">New Game</h1>
      <div className="mt-6 space-y-2">
        {(["pvbot_easy", "pvbot_medium", "pvbot_hard", "hotseat"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            {m}
          </label>
        ))}
      </div>
      <button className="mt-6 rounded-md bg-blue-600 px-6 py-3 text-white">Start</button>
    </main>
  );
}
