import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, CardHeader, Input, Textarea } from '@shared/ui';
import { Hourglass, Camera, Activity, ShieldAlert } from '@shared/ui/icons';
import { useToast } from '@shared/hooks/use-toast';
import { ws } from '@shared/window-api';
import { api } from '@shared/services/api-client';
import type { InstanceFull } from '@shared/types';

interface Props {
  sessionId: string;
  recovered?: boolean;
  initialInstanceId?: string;
  onEnded: () => void;
}

const fmt = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const SessionScreen = ({ sessionId, recovered, initialInstanceId, onEnded }: Props) => {
  const { push } = useToast();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(initialInstanceId ?? null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const [debug, setDebug] = useState<{
    snapshot?: unknown;
    lastTick?: { sessionId: string; remainingMs: number; matched: boolean; at: string };
    tickCount: number;
  }>({ tickCount: 0 });

  // Pull session state from main on mount, then subscribe to ticks.
  useEffect(() => {
    console.log('[session-screen] mount', { sessionId, initialInstanceId, recovered });
    let unsub: (() => void) | null = null;
    let unsubExpired: (() => void) | null = null;
    void ws()
      .session.requestState()
      .then((s) => {
        console.log('[session-screen] requestState →', s);
        setDebug((d) => ({ ...d, snapshot: s }));
        if (s.inProgress) {
          setRemainingMs(s.remainingMs ?? null);
          if (s.instanceId) setInstanceId(s.instanceId);
        }
      });
    unsub = ws().session.onTick((p) => {
      const matched = p.sessionId === sessionId;
      setDebug((d) => ({
        ...d,
        tickCount: d.tickCount + 1,
        lastTick: { sessionId: p.sessionId, remainingMs: p.remainingMs, matched, at: new Date().toISOString() },
      }));
      if (!matched) {
        console.warn('[session-screen] tick ignored — sessionId mismatch', {
          screenSessionId: sessionId,
          tickSessionId: p.sessionId,
        });
        return;
      }
      setRemainingMs(p.remainingMs);
    });
    unsubExpired = ws().session.onExpired((p) => {
      console.log('[session-screen] expired event', p);
      if (submittedRef.current) return;
      push('Time is up. Your session has been auto-closed.', 'info');
      onEnded();
    });
    return () => {
      unsub?.();
      unsubExpired?.();
    };
  }, [sessionId, initialInstanceId, recovered, onEnded, push]);

  const { data: instance } = useQuery({
    queryKey: ['session-instance', instanceId],
    queryFn: () => api<InstanceFull>(`/candidate/assignments/${instanceId}`),
    enabled: !!instanceId,
  });

  const submissionType = instance?.assignment.submissionType ?? 'both';
  const wantsLink = submissionType === 'link' || submissionType === 'both';
  const wantsText = submissionType === 'text' || submissionType === 'both';

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      submissionContent: wantsText ? submissionContent.trim() || undefined : undefined,
      submissionLink: wantsLink ? submissionLink.trim() || undefined : undefined,
      terminationClean: !recovered,
    };
    console.log('[session-screen] submit →', { sessionId, payload });
    try {
      submittedRef.current = true;
      const result = await ws().session.submit(payload);
      console.log('[session-screen] submit ✓', result);
      push('Submission sent', 'success');
      onEnded();
    } catch (err) {
      submittedRef.current = false;
      console.error('[session-screen] submit ✗', err);
      push(err instanceof Error ? err.message : 'Could not submit', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Persistent HUD bar — always visible at the top */}
      <div className="sticky top-0 z-30 bg-brand-900 text-brand-50 px-8 py-3 flex items-center justify-between shadow-lift">
        <div className="flex items-center gap-3">
          <span className="font-display text-base">Session in progress</span>
          {recovered && (
            <Badge tone="rose" icon={<ShieldAlert size={11} />}>
              Recovered
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-2xl tabular-nums">
          <Hourglass size={18} />
          {remainingMs == null ? '--:--' : fmt(remainingMs)}
        </div>
      </div>

      {/* DEBUG STRIP — temporary visibility into session state. Remove once the bug is settled. */}
      <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 font-mono text-[11px] text-amber-900 leading-relaxed">
        <div>
          <span className="font-semibold">screen.sessionId:</span> {sessionId}
          {' · '}
          <span className="font-semibold">screen.instanceId:</span> {instanceId ?? '(none)'}
          {' · '}
          <span className="font-semibold">recovered:</span> {String(!!recovered)}
        </div>
        <div>
          <span className="font-semibold">remainingMs:</span>{' '}
          {remainingMs == null ? 'null' : remainingMs}
          {' · '}
          <span className="font-semibold">ticks received:</span> {debug.tickCount}
          {debug.lastTick && (
            <>
              {' · '}
              <span className="font-semibold">last tick:</span>{' '}
              {debug.lastTick.sessionId} ({debug.lastTick.remainingMs}ms,{' '}
              {debug.lastTick.matched ? 'matched' : 'MISMATCH'})
            </>
          )}
        </div>
        <div>
          <span className="font-semibold">main.requestState:</span>{' '}
          {debug.snapshot ? JSON.stringify(debug.snapshot) : '(pending)'}
        </div>
        <div>
          <span className="font-semibold">instance loaded:</span>{' '}
          {instance ? `${instance.assignment.title} (${submissionType})` : '(loading or none)'}
        </div>
      </div>

      <main className="flex-1 px-10 py-8 max-w-3xl mx-auto w-full">
        {recovered && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">We detected an abnormal termination of WorkSight.</p>
            <p className="mt-1">
              Your session is still active on the server. Submit your work below before the
              countdown reaches zero — it will run out and auto-close otherwise.
            </p>
          </div>
        )}

        <h1 className="font-display text-3xl tracking-tight">{instance?.assignment.title ?? 'Session'}</h1>
        <p className="text-sm text-ink-muted mt-1">
          Code wherever you like. WorkSight keeps an eye on the rules from here.
        </p>

        <Card className="mt-6">
          <CardHeader title="Brief" />
          <div className="text-sm whitespace-pre-wrap text-ink-muted leading-relaxed max-h-60 overflow-y-auto">
            {instance?.assignment.brief ?? '—'}
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader
            title="Submission"
            subtitle="When you're ready, submit your work below. This ends the session early."
          />
          <div className="space-y-4">
            {wantsLink && (
              <Input
                label="GitHub or repo link"
                type="url"
                placeholder="https://github.com/..."
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
              />
            )}
            {wantsText && (
              <Textarea
                label="Notes / answer"
                rows={6}
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Walk us through your approach..."
              />
            )}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Camera size={11} /> Screenshots are being captured.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity size={11} /> Network restrictions are active.
            </span>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} loading={submitting}>
              Submit and end session
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};
