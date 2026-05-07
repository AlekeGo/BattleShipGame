export function RouteBar({
  path,
  label,
  right,
}: {
  path: string;
  label?: string;
  right?: string;
}) {
  return (
    <div className="route-bar">
      <span>
        <span style={{ opacity: 0.5 }}>~/</span>
        <span className="route">{path}</span>
        {label && <> &nbsp;·&nbsp; {label}</>}
      </span>
      {right && <span>{right}</span>}
    </div>
  );
}
