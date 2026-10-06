import 'server-only';

const BASE = (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

type Options = {
  locale?: string;
  /** Cache tags; Laravel purges them through /api/revalidate. */
  tags?: string[];
  /** Seconds. Default 300; `false` = never cache (account pages). */
  revalidate?: number | false;
  token?: string;
};

/**
 * Server-side GET for Server Components / generateMetadata / sitemap.
 * Returns null on 404 so pages can call notFound(); throws on other errors so they surface.
 */
export async function apiGet<T>(path: string, { locale, tags, revalidate = 300, token }: Options = {}): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(locale ? { 'X-Locale': locale } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(revalidate === false || token
      ? { cache: 'no-store' as const }
      : { next: { revalidate, tags } }),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on GET ${path}`);

  return (await res.json()) as T;
}
