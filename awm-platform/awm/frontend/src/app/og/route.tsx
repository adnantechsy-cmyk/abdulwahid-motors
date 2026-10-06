import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/** The AW monogram from public/brand/logo-mark.svg, inlined so the image needs no file or network access. */
const MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 30 320 100" width="320" height="100">' +
  '<defs><clipPath id="m"><rect x="0" y="30" width="400" height="100"/></clipPath></defs>' +
  '<g stroke="#D9002A" stroke-width="26" fill="none" stroke-linejoin="miter" stroke-miterlimit="4" clip-path="url(#m)">' +
  '<polyline points="50,150 110,10 170,150"/><line x1="75" y1="90" x2="145" y2="90"/>' +
  '<polyline points="180,10 215,150 255,40 295,150 330,10"/></g></svg>';
const MARK = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

/**
 * Brand card for social previews (Open Graph / Twitter) on pages that have no photo of their own.
 * The only input is the language, so nobody can make this endpoint print arbitrary text.
 * Latin text only: the built-in font has no Arabic glyphs; the Arabic name is in the logo file itself.
 */
export function GET(request: NextRequest) {
  const ar = request.nextUrl.searchParams.get('l') === 'ar';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#1c1b1b', color: '#ffffff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} alt="" width={256} height={80} />
          <div style={{ display: 'flex', fontSize: 34, color: '#ff6b81', fontWeight: 700 }}>BYD</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>Abdul Wahid Motors</div>
          <div style={{ display: 'flex', fontSize: 38, color: '#d9d4d4' }}>{ar ? 'Authorized BYD dealer · Damascus · Syria' : 'Authorized BYD dealer · Damascus'}</div>
        </div>
        <div style={{ display: 'flex', height: 10, width: 220, background: '#d90429' }} />
      </div>
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400' } },
  );
}
