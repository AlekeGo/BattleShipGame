export default function FleetStatus({ ships }: { ships?: { name: string; sunk: boolean }[] }) {
  const list = ships ?? [];
  return (
    <div className="ships-remaining">
      {list.map((s) => (
        <span key={s.name} className={`pip${s.sunk ? " gone" : ""}`} title={s.name} />
      ))}
    </div>
  );
}
