import { useEffect, type ReactNode } from 'react';
import { X } from '@shared/ui/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widths: Record<NonNullable<Props['width']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export const Modal = ({ open, onClose, title, description, children, footer, width = 'md' }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[width]} bg-surface rounded-2xl shadow-lift border border-line overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink p-1 rounded-md hover:bg-surface-sunken"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line bg-surface-subtle flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
