type Props = { eyebrow: string; title: string; text: string; children?: React.ReactNode };

/** Top-of-page banner shared by About, Services and Contact. Actions go in as children. */
export function PageHero({ eyebrow, title, text, children }: Props) {
  return (
    <section aria-labelledby="page-title" className="border-b border-awm-line">
      <div className="container-awm py-12 lg:py-16">
        <div className="max-w-3xl border-s-4 border-awm-red ps-6">
          <p className="mb-3 text-sm font-bold text-awm-red">{eyebrow}</p>
          <h1 id="page-title" className="text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-awm-muted">{text}</p>
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}
