import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';

interface Props {
  children: string;
  className?: string;
}

export const MarkdownBody = ({ children, className }: Props) => (
  <div
    className={clsx(
      'text-sm text-ink leading-relaxed',
      '[&>*+*]:mt-3',
      '[&_h1]:font-display [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-ink [&_h1]:mt-4',
      '[&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-4',
      '[&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-3',
      '[&_h4]:font-medium [&_h4]:text-sm [&_h4]:text-ink [&_h4]:mt-3',
      '[&_p]:text-sm [&_p]:text-ink-muted [&_p]:leading-relaxed',
      '[&_strong]:font-semibold [&_strong]:text-ink',
      '[&_em]:italic',
      '[&_del]:line-through [&_del]:text-ink-soft',
      '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-muted [&_ul]:space-y-1',
      '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-ink-muted [&_ol]:space-y-1',
      '[&_li]:leading-relaxed',
      '[&_li>input[type="checkbox"]]:mr-2 [&_li>input[type="checkbox"]]:accent-brand-700',
      "[&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-surface-sunken [&_code]:text-ink [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded",
      '[&_pre]:bg-ink [&_pre]:text-brand-50 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:leading-relaxed',
      "[&_pre>code]:bg-transparent [&_pre>code]:text-inherit [&_pre>code]:p-0 [&_pre>code]:rounded-none",
      '[&_a]:text-brand-700 [&_a]:underline-offset-4 hover:[&_a]:underline hover:[&_a]:text-brand-800',
      '[&_blockquote]:border-l-4 [&_blockquote]:border-brand-200 [&_blockquote]:pl-4 [&_blockquote]:text-ink-muted [&_blockquote]:italic',
      '[&_table]:w-full [&_table]:border-collapse [&_table]:text-xs',
      '[&_th]:border [&_th]:border-line [&_th]:bg-surface-subtle [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
      '[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2',
      '[&_hr]:my-4 [&_hr]:border-line',
      '[&_img]:max-w-full [&_img]:rounded-lg',
      className
    )}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);
