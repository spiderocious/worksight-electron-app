import clsx from 'clsx';

export const Spinner = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <span
    className={clsx('inline-block border-2 border-current border-t-transparent rounded-full animate-spin', className)}
    style={{ width: size, height: size }}
  />
);

export const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-ink-muted">
    <Spinner size={20} />
  </div>
);
