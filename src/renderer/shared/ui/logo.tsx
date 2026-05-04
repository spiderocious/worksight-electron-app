import clsx from 'clsx';

interface Props {
  size?: number;
  withText?: boolean;
  className?: string;
}

export const Logo = ({ size = 28, withText = true, className }: Props) => (
  <span className={clsx('inline-flex items-center gap-2.5', className)}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#14532D" />
      <path
        d="M9 17.5L13 21.5L23 11.5"
        stroke="#4ADE80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="9.5" r="2" fill="#86EFAC" />
    </svg>
    {withText && (
      <span className="font-display text-[1.05rem] font-medium tracking-tight text-ink">
        Work<span className="text-brand-700">Sight</span>
      </span>
    )}
  </span>
);
