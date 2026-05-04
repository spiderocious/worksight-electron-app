import { useEffect } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, Logo, PageLoader } from '@shared/ui';
import {
  Clock,
  ChevronRight,
  ListChecks,
  CheckCircle2,
  LogOut,
  Star,
} from '@shared/ui/icons';
import { useToast } from '@shared/hooks/use-toast';
import { ws } from '@shared/window-api';
import { formatDate } from '@shared/utils/format-date';
import { useCandidateMe } from './api/use-me';

interface Props {
  onPickAssignment: (instanceId: string) => void;
  onResumeSession: (sessionId: string) => void;
  onSignOut: () => void;
}

export const DashboardScreen = ({ onPickAssignment, onResumeSession, onSignOut }: Props) => {
  const { data, isLoading, refetch } = useCandidateMe();
  const { push } = useToast();

  useEffect(() => {
    if (data?.topBarStatus) {
      void ws().tray.updateStatus(data.topBarStatus);
    }
  }, [data?.topBarStatus]);

  const handleSignOut = async () => {
    try {
      await ws().auth.clearToken();
      onSignOut();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not sign out', 'error');
    }
  };

  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="min-h-screen">
      <header className="px-10 pt-10 pb-6 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{data.candidate.name}</p>
            <p className="text-xs text-ink-soft">{data.candidate.email}</p>
          </div>
          <Button variant="ghost" iconLeft={<LogOut size={14} />} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="px-10 pb-16 max-w-4xl">
        <h1 className="font-display text-3xl tracking-tight">Hello, {data.candidate.name.split(' ')[0]}</h1>
        <p className="text-sm text-ink-muted mt-1">{data.topBarStatus}</p>

        {data.inProgress.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wider text-amber-700 mb-3">
              In progress
            </h2>
            <div className="space-y-3">
              {data.inProgress.map((it) => (
                <Card key={it.id} className="border-amber-300 bg-amber-50/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-ink">{it.assignment.title}</h3>
                      <p className="text-xs text-ink-muted mt-1">
                        Expires {formatDate(it.expiresAt)}
                      </p>
                    </div>
                    <Button onClick={() => onResumeSession(it.sessionId)}>Resume</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-soft mb-3">
            Pending
          </h2>
          {data.pending.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ListChecks size={32} strokeWidth={1.5} />}
                title="Nothing pending"
                description="When your reviewer assigns an assessment, it will show up here."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {data.pending.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onPickAssignment(it.id)}
                  className="w-full text-left ws-card p-5 hover:shadow-lift transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate">{it.assignment.title}</h3>
                      <p className="text-sm text-ink-muted line-clamp-2 mt-1">
                        {it.assignment.brief}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge tone="brand" icon={<Clock size={11} />}>
                          {it.assignment.durationMinutes} min
                        </Badge>
                        <Badge tone="neutral">{it.assignment.submissionType}</Badge>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-ink-soft shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {data.completed.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-medium uppercase tracking-wider text-ink-soft mb-3">
              Completed
            </h2>
            <Card className="p-0">
              <div className="divide-y divide-line">
                {data.completed.map((it) => (
                  <div key={it.instance.id} className="px-5 py-4 flex items-center gap-4">
                    <CheckCircle2 size={18} className="text-brand-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{it.assignment.title}</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {formatDate(it.instance.createdAt)}
                      </p>
                      {it.score?.feedback && (
                        <p className="text-sm text-ink-muted mt-2 italic">
                          "{it.score.feedback}"
                        </p>
                      )}
                    </div>
                    {it.score && (
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-brand-800">
                          <Star size={14} className="fill-brand-500 stroke-brand-700" />
                          <span className="text-base font-semibold">
                            {it.score.numericScore}
                            <span className="text-ink-soft text-xs font-normal">/100</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        <div className="mt-10">
          <Button variant="ghost" onClick={() => void refetch()}>
            Refresh
          </Button>
        </div>
      </main>
    </div>
  );
};
