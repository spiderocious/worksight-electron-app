import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardHeader, EmptyState, PageLoader } from '@shared/ui';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hourglass,
  Star,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Activity,
} from '@shared/ui/icons';
import { api } from '@shared/services/api-client';
import { formatDate, formatDuration } from '@shared/utils/format-date';
import type { InstanceFull } from '@shared/types';

interface CompletedSession {
  id: string;
  instanceId: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: string;
  submissionContent: string | null;
  submissionLink: string | null;
  terminationClean: boolean | null;
  autoClosed: boolean;
  screenshots: Array<{ key: string; capturedAt: string }>;
}

interface CompletedScore {
  numericScore: number;
  feedback: string;
}

interface Props {
  instanceId: string;
  sessionId: string;
  score: CompletedScore | null;
  onBack: () => void;
}

export const CompletedDetailScreen = ({ instanceId, sessionId, score, onBack }: Props) => {
  const { data: instance, isLoading: loadingInstance } = useQuery({
    queryKey: ['candidate-instance', instanceId],
    queryFn: () => api<InstanceFull>(`/candidate/assignments/${instanceId}`),
  });
  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['candidate-session', sessionId],
    queryFn: () => api<CompletedSession>(`/candidate/sessions/${sessionId}`),
  });

  if (loadingInstance || loadingSession || !instance || !session) return <PageLoader />;

  const cleanBadge = session.autoClosed ? (
    <Badge tone="rose" icon={<Hourglass size={11} />}>
      Auto-closed
    </Badge>
  ) : session.terminationClean ? (
    <Badge tone="success" icon={<ShieldCheck size={11} />}>
      Clean
    </Badge>
  ) : (
    <Badge tone="amber" icon={<ShieldAlert size={11} />}>
      Abnormal
    </Badge>
  );

  return (
    <div className="min-h-screen px-10 py-10 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> Back to assignments
      </button>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={20} className="text-brand-700" />
          <span className="text-xs uppercase tracking-[0.18em] text-brand-700 font-medium">
            Completed
          </span>
        </div>
        <h1 className="font-display text-3xl tracking-tight">
          {instance.assignment.hideUntilStart
            ? instance.assignment.mainTitle ?? instance.assignment.title
            : instance.assignment.title}
        </h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {cleanBadge}
          <Badge tone="brand" icon={<Clock size={11} />}>
            {instance.assignment.durationMinutes} min
          </Badge>
          <Badge tone="neutral">{instance.assignment.submissionType}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Meta label="Started" value={formatDate(session.startedAt)} icon={<Clock size={13} />} />
        <Meta label="Ended" value={formatDate(session.endedAt)} icon={<Clock size={13} />} />
        <Meta
          label="Duration"
          value={formatDuration(session.durationSeconds)}
          icon={<Hourglass size={13} />}
        />
      </div>

      {/* Score panel: real score, or "awaiting review" */}
      <Card className="mb-6">
        <CardHeader title="Result" subtitle="Your reviewer's score and feedback." />
        {score ? (
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <Star size={18} className="fill-brand-500 stroke-brand-700" />
              <span className="font-display text-3xl text-brand-800 tabular-nums">
                {score.numericScore}
              </span>
              <span className="text-ink-soft text-sm">/100</span>
            </div>
            {score.feedback && (
              <div className="ws-card p-4 bg-surface-subtle text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {score.feedback}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Activity size={28} strokeWidth={1.5} />}
            title="Awaiting review"
            description="Your reviewer is still evaluating your submission. You'll see your score and feedback here once they're done."
          />
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader title="Your submission" />
        {session.submissionLink && (
          <div className="mb-4">
            <p className="text-xs text-ink-muted mb-1">Link</p>
            <a
              href={session.submissionLink}
              target="_blank"
              rel="noreferrer"
              className="ws-link inline-flex items-center gap-1 break-all"
            >
              {session.submissionLink}
              <ExternalLink size={12} />
            </a>
          </div>
        )}
        {session.submissionContent ? (
          <div>
            <p className="text-xs text-ink-muted mb-1">Notes</p>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-surface-subtle border border-line rounded-lg p-4 leading-relaxed">
              {session.submissionContent}
            </pre>
          </div>
        ) : !session.submissionLink ? (
          <p className="text-sm text-ink-soft italic">No submission was captured.</p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Brief" subtitle="The test you worked on." />
        <div className="text-sm whitespace-pre-wrap text-ink-muted leading-relaxed max-h-80 overflow-y-auto">
          {(instance.assignment.hideUntilStart
            ? instance.assignment.mainBrief
            : instance.assignment.brief) ?? '—'}
        </div>
      </Card>
    </div>
  );
};

const Meta = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="ws-card p-3">
    <div className="flex items-center gap-1.5 text-[10px] text-ink-soft uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-xs font-medium text-ink">{value}</div>
  </div>
);
