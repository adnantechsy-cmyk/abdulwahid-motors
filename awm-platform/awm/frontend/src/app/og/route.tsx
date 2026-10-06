import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/**
 * Brand card for social previews (Open Graph / Twitter) on pages that have no photo of their own.
 * The only input is the language, so nobody can make this endpoint print arbitrary text.
 * Latin text only: the built-in font has no Arabic glyphs, and the brand name is Latin on the logo anyway.
 */
export function GET(request: NextRequest) {
  const ar = request.nextUrl.searchParams.get('l') === 'ar';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#1c1b1b', color: '#ffffff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', width: 96, height: 96, background: '#d90429', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800 }}>AWM</div>
          <div style={{ display: 'flex', fontSize: 34, color: '#d90429', fontWeight: 700 }}>BYD</div>
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
