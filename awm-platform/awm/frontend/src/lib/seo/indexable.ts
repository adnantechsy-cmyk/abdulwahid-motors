/** What crawlers get on indexable pages: full snippets and large image previews. */
export const INDEXABLE = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
} as const;
