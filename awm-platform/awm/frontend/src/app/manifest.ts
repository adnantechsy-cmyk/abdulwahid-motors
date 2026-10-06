import type { MetadataRoute } from 'next';

/** Web app manifest: lets phones show the right name, colours and icon when the site is saved to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Abdul Wahid Motors',
    short_name: 'AWM',
    description: 'Authorized BYD dealer in Damascus: cars, genuine spare parts and service.',
    start_url: '/ar',
    display: 'standalone',
    background_color: '#fcf9f8',
    theme_color: '#d90429',
    lang: 'ar',
    dir: 'rtl',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
