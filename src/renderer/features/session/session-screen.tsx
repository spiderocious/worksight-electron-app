import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, CardHeader, Input, Spinner, Textarea } from '@shared/ui';
import { Hourglass, Camera, Activity, ShieldAlert } from '@shared/ui/icons';
import { useToast } from '@shared/hooks/use-toast';
import { ws } from '@shared/window-api';
import { api } from '@shared/services/api-client';
import { ALLOW_SCREENSHOTS } from '@shared/feature-flags';
import type { InstanceFull } from '@shared/types';

interface CandidateSettings {
  postSubmissionTitle: string;
  postSubmissionDescription: string;
  showScreenshotWarning: boolean;
}

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
  const [capturing, setCapturing] = useState(false);
  const submittedRef = useRef(false);

  // Pull session state from main on mount, then subscribe to ticks.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let unsubExpired: (() => void) | null = null;
    void ws()
      .session.requestState()
      .then((s) => {
        if (s.inProgress) {
          setRemainingMs(s.remainingMs ?? null);
          if (s.instanceId) setInstanceId(s.instanceId);
        }
      });
    unsub = ws().session.onTick((p) => {
      // Accept any tick — main is the source of truth. If the screen's sessionId
      // is stale (e.g. reroute mid-session), we still want the timer accurate.
      setRemainingMs(p.remainingMs);
    });
    unsubExpired = ws().session.onExpired(() => {
      if (submittedRef.current) return;
      push('Time is up. Your session has been auto-closed.', 'info');
      onEnded();
    });
    return () => {
      unsub?.();
      unsubExpired?.();
    };
  }, [sessionId, onEnded, push]);

  const { data: instance } = useQuery({
    queryKey: ['session-instance', instanceId],
    queryFn: () => api<InstanceFull>(`/candidate/assignments/${instanceId}`),
    enabled: !!instanceId,
  });

  const { data: settings } = useQuery({
    queryKey: ['candidate-settings'],
    queryFn: () => api<CandidateSettings>('/candidate/settings'),
    staleTime: 60_000,
  });

  const submissionType = instance?.assignment.submissionType ?? 'both';
  const wantsLink = submissionType === 'link' || submissionType === 'both';
  const wantsText = submissionType === 'text' || submissionType === 'both';
  // Hide the in-session screenshot affordance when either the reviewer turned
  // it off OR the build itself has screenshots disabled.
  const showWarning =
    ALLOW_SCREENSHOTS && (settings?.showScreenshotWarning ?? true);

  const handleCaptureNow = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const result = await ws().session.captureNow();
      if (result.ok) {
        push(`Screenshot uploaded — ${result.key?.slice(0, 12)}…`, 'success');
      } else {
        push(result.error ?? 'Could not capture screenshot', 'error');
      }
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not capture', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      submissionContent: wantsText ? submissionContent.trim() || undefined : undefined,
      submissionLink: wantsLink ? submissionLink.trim() || undefined : undefined,
      terminationClean: !recovered,
    };
    try {
      submittedRef.current = true;
      await ws().session.submit(payload);
      push('Submission sent', 'success');
      onEnded();
    } catch (err) {
      submittedRef.current = false;
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

        {/* When the reviewer chose to hide the real test, mainTitle/mainBrief
            are populated and we use them inside the session. Otherwise fall
            back to the public title/brief. */}
        <h1 className="font-display text-3xl tracking-tight">
          {(instance?.assignment.hideUntilStart
            ? instance.assignment.mainTitle
            : instance?.assignment.title) ?? 'Session'}
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Code wherever you like. WorkSight keeps an eye on the rules from here.
        </p>

        <Card className="mt-6">
          <CardHeader title="Brief" />
          <div className="text-sm whitespace-pre-wrap text-ink-muted leading-relaxed max-h-60 overflow-y-auto">
            {(instance?.assignment.hideUntilStart
              ? instance.assignment.mainBrief
              : instance?.assignment.brief) ?? '—'}
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
          <div className="mt-6 flex items-center justify-between text-xs text-ink-soft gap-4 flex-wrap">
            {showWarning ? (
              <button
                type="button"
                onClick={handleCaptureNow}
                disabled={capturing}
                className="inline-flex items-center gap-1.5 hover:text-brand-700 transition disabled:opacity-50"
                title="Tap to capture a screenshot now (test)"
              >
                {capturing ? (
                  <Spinner size={11} className="text-brand-700" />
                ) : (
                  <Camera size={11} />
                )}
                <span>
                  {capturing ? 'Capturing…' : 'Screenshots are being captured.'}{' '}
                  <span className="text-ink-soft/70">(tap to test)</span>
                </span>
              </button>
            ) : (
              <span />
            )}
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
