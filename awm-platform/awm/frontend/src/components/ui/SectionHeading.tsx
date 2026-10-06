type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned slot (RTL: left) for a "view all" link. */
  action?: React.ReactNode;
  as?: 'h1' | 'h2';
  id?: string;
};

/** Section title with the red square eyebrow used across the Figma pages. */
export function SectionHeading({ eyebrow, title, description, action, as: Tag = 'h2', id }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-xs font-bold text-awm-red">
            <span aria-hidden="true" className="size-2 bg-awm-red" />
            {eyebrow}
          </p>
        )}
        <Tag id={id} className="text-3xl font-extrabold leading-tight sm:text-4xl">{title}</Tag>
        {description && <p className="mt-3 text-base leading-7 text-awm-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
