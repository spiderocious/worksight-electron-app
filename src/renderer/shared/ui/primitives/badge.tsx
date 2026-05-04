import type { ReactNode } from 'react';
import clsx from 'clsx';

type Tone = 'neutral' | 'brand' | 'amber' | 'rose' | 'sky' | 'success';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted border-line',
  brand: 'bg-brand-50 text-brand-800 border-brand-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  sky: 'bg-sky-50 text-sky-800 border-sky-200',
  success: 'bg-brand-100 text-brand-900 border-brand-300',
};

interface Props {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export const Badge = ({ tone = 'neutral', children, className, icon }: Props) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-wide uppercase',
      tones[tone],
      className
    )}
  >
    {icon}
    {children}
  </span>
);
