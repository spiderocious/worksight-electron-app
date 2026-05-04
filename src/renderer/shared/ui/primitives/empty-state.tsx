import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: Props) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    {icon && <div className="mb-3 text-brand-500">{icon}</div>}
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    {description && <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
