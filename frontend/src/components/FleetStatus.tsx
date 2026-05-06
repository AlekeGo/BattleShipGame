export default function FleetStatus({ ships }: { ships?: { name: string; sunk: boolean }[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {(ships ?? []).map((s) => (
        <li key={s.name} className={s.sunk ? "line-through opacity-50" : ""}>
          {s.name}
        </li>
      ))}
    </ul>
  );
}
