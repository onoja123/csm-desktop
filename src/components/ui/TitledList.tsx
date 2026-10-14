export function TitledList({
  title,
  items,
  note,
  mono = false,
}: {
  title: string;
  items?: string[];
  note?: string;
  mono?: boolean;
}) {
  if (!items?.length) return null;

  return (
    <div className="handoff-list">
      <h4>
        {title}
        {note ? <span className="handoff-list__note">{note}</span> : null}
      </h4>

      <ul>
        {items.map((i, n) => (
          <li key={n} className={mono ? 'selectable mono' : 'selectable'}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
