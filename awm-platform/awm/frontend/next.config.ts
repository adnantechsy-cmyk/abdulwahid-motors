import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Images uploaded in the Laravel admin are served from the API host (/storage/...).
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1');

// IMPORTANT for Hostinger: export an OBJECT, never a function config.
// Hostinger wraps this file to add output: 'standalone'; a function config breaks the deploy.
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: api.protocol.replace(':', '') as 'http' | 'https', hostname: api.hostname, port: api.port, pathname: '/storage/**' },
    ],
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        // HTTPS only (browsers ignore it on plain http). Hostinger serves the site over SSL.
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        // A deliberately loose baseline: it blocks plugins, base-tag and form hijacking and framing by other sites,
        // without restricting scripts (Next.js inline scripts, Google sign-in and the Google Maps frames keep working).
        { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'" },
      ],
    }];
  },
};

export default withNextIntl(config);
