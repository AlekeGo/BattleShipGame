"use client";

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Upgrade to Pro</h2>
        <p className="mt-2 text-sm opacity-70">
          Custom ship skins, animated explosions, deep analytics. Join the waitlist.
        </p>
        <button onClick={onClose} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white">
          Close
        </button>
      </div>
    </div>
  );
}
