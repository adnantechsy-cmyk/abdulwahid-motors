export type SpecRow = { label: string; value: string };

/** Two-column spec table. Semantic dl so screen readers announce label/value pairs. */
export function SpecList({ rows }: { rows: SpecRow[] }) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 border border-awm-line bg-white sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-awm-line px-4 py-3 text-sm sm:odd:border-e">
          <dt className="text-awm-muted">{r.label}</dt>
          <dd className="font-bold">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
