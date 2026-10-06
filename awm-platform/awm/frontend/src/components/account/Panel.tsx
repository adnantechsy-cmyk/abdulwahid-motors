type Props = {
  title: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Titled white card used by every account section. */
export function Panel({ title, id, action, children, className = '' }: Props) {
  return (
    // role="group", not a landmark: a table inside is already a labelled region, and two landmarks must not share a name.
    <div role="group" aria-labelledby={id} className={`border border-awm-line bg-white ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-awm-line px-5 py-4">
        <h2 id={id} className="flex items-center gap-3 text-lg font-extrabold">
          <span aria-hidden="true" className="h-5 w-1 bg-awm-red" />
          {title}
        </h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-awm-line p-6 text-center text-sm text-awm-muted">{children}</p>;
}

/** Horizontally scrollable wrapper so wide tables never break the page on phones. */
export function TableScroll({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export const th = 'whitespace-nowrap border-b border-awm-line bg-awm-panel px-4 py-3 text-start text-xs font-bold text-awm-muted';
export const td = 'border-b border-awm-line px-4 py-3 align-middle text-sm';
