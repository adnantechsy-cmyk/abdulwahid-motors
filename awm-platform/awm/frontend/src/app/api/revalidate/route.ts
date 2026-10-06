import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED = new Set(['seo', 'sitemap', 'vehicles', 'parts', 'pages', 'categories']);

/**
 * Called by Laravel (SeoService::revalidate) after an admin edit, so new meta tags,
 * prices and sitemap entries go live without waiting for the cache to expire.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED.has(t)) : [];

  tags.forEach((tag) => revalidateTag(tag));

  return NextResponse.json({ revalidated: tags });
}
