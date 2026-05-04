import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export const Card = ({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('ws-card p-5', className)} {...rest}>
    {children}
  </div>
);

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export const CardHeader = ({ title, subtitle, right, className }: CardHeaderProps) => (
  <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
    <div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);
