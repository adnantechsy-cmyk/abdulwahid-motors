/** Renders schema.org JSON-LD from the Laravel SEO payload. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown>[] | Record<string, unknown> }) {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return null;

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
