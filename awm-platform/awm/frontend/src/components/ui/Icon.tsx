/** Minimal square-cap line icons (24px grid). Decorative: always aria-hidden. */
const paths = {
  car: 'M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2h3v-2m10 0v2h3v-2M7 12h10',
  wrench: 'M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  truck: 'M2 6h11v10H2zM13 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  headset: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3zM17 19c0 1.5-2 2-5 2',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  battery: 'M3 8h15v8H3zM18 11h3v2h-3zM7 11v2M10 11v2',
  check: 'M5 12l4 4 10-10',
  arrow: 'M5 12h14M13 6l6 6-6 6',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      // Arrows point toward the reading direction.
      className={`${name === 'arrow' ? 'rtl:-scale-x-100' : ''} ${className}`}
    >
      <path d={paths[name]} />
    </svg>
  );
}
