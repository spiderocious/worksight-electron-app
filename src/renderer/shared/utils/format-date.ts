export const formatDate = (iso: string | Date | null | undefined): string => {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatRelative = (iso: string | Date | null | undefined): string => {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (Math.abs(diff) < 60) return 'just now';
  if (Math.abs(diff) < 3600) return `${Math.round(diff / 60)} min ago`;
  if (Math.abs(diff) < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return formatDate(d);
};

export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};
