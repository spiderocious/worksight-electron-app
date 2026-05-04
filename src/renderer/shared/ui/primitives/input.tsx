import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const baseField =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition';

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, className, id, ...rest }, ref) => {
  const fieldId = id ?? rest.name;
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-xs font-medium text-ink-muted mb-1.5">{label}</span>
      )}
      <input
        ref={ref}
        id={fieldId}
        className={clsx(baseField, error && 'border-danger focus:ring-red-200 focus:border-danger', className)}
        {...rest}
      />
      {hint && !error && <span className="block mt-1.5 text-xs text-ink-soft">{hint}</span>}
      {error && <span className="block mt-1.5 text-xs text-danger">{error}</span>}
    </label>
  );
});
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, hint, error, className, id, ...rest }, ref) => {
  const fieldId = id ?? rest.name;
  return (
    <label className="block w-full">
      {label && <span className="block text-xs font-medium text-ink-muted mb-1.5">{label}</span>}
      <textarea
        ref={ref}
        id={fieldId}
        className={clsx(baseField, 'resize-y min-h-24', error && 'border-danger focus:ring-red-200 focus:border-danger', className)}
        {...rest}
      />
      {hint && !error && <span className="block mt-1.5 text-xs text-ink-soft">{hint}</span>}
      {error && <span className="block mt-1.5 text-xs text-danger">{error}</span>}
    </label>
  );
});
Textarea.displayName = 'Textarea';

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className, children, id, ...rest }, ref) => {
  const fieldId = id ?? rest.name;
  return (
    <label className="block w-full">
      {label && <span className="block text-xs font-medium text-ink-muted mb-1.5">{label}</span>}
      <select
        ref={ref}
        id={fieldId}
        className={clsx(baseField, 'pr-10', error && 'border-danger', className)}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="block mt-1.5 text-xs text-danger">{error}</span>}
    </label>
  );
});
Select.displayName = 'Select';
