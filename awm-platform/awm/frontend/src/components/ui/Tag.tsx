type Tone = 'dark' | 'red' | 'light';

const tones: Record<Tone, string> = {
  dark: 'bg-awm-black text-white',
  red: 'bg-awm-red text-white',
  light: 'bg-awm-surface text-awm-black',
};

export function Tag({ tone = 'dark', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-block px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
