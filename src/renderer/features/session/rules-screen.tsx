import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, EmptyState, PageLoader } from '@shared/ui';
import { ArrowLeft, ListChecks } from '@shared/ui/icons';
import { ICON_BY_NAME, renderIconByName } from '@shared/ui/icon-catalog';
import { useToast } from '@shared/hooks/use-toast';
import { ws } from '@shared/window-api';
import { api } from '@shared/services/api-client';

interface CandidateRule {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  order: number;
}

interface Props {
  instanceId: string;
  onCancel: () => void;
  onStarted: (sessionId: string) => void;
  onNeedsScreenPermission: () => void;
}

const RuleRow = ({
  iconName,
  title,
  subtitle,
}: {
  iconName: string;
  title: string;
  subtitle: string;
}) => {
  const Icon = ICON_BY_NAME[iconName];
  return (
    <div className="flex gap-4 py-4">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
        {Icon ? <Icon size={18} /> : renderIconByName('CircleDot', { size: 18 })}
      </div>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-ink-muted leading-relaxed mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
};

export const RulesScreen = ({ instanceId, onCancel, onStarted, onNeedsScreenPermission }: Props) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);
  const { push } = useToast();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['candidate-rules'],
    queryFn: () => api<CandidateRule[]>('/candidate/rules'),
    staleTime: 60_000,
  });

  const handleStart = async () => {
    setStarting(true);
    try {
      // Preflight: macOS Screen Recording permission. Without it, screenshots
      // come back as black images and the session is worthless. Route to a
      // dedicated screen rather than letting the candidate stumble into a
      // broken session.
      const status = await ws().permissions.screenStatus();
      if (status !== 'granted') {
        setStarting(false);
        onNeedsScreenPermission();
        return;
      }

      const result = await ws().session.start({ instanceId });
      onStarted(result.sessionId);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not start session', 'error');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen px-10 py-10 max-w-3xl mx-auto">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6"
        disabled={starting}
      >
        <ArrowLeft size={14} /> Back to brief
      </button>

      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Before you start</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-xl">
          By starting this session, you agree to everything below. Make sure you read each item
          carefully — these restrictions are the whole point of WorkSight.
        </p>
      </header>

      {isLoading ? (
        <PageLoader />
      ) : !rules || rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks size={32} strokeWidth={1.5} />}
            title="No rules configured"
            description="Your reviewer hasn't added any session rules yet. Ask them to set them up before you start."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line p-0 px-5">
          {rules.map((r) => (
            <RuleRow key={r.id} iconName={r.icon} title={r.title} subtitle={r.subtitle} />
          ))}
        </Card>
      )}

      <label className="mt-8 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand-700"
        />
        <span className="text-sm text-ink">
          I understand. I'm ready to start this session under the conditions above.
        </span>
      </label>

      <div className="mt-8 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={starting}>
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          disabled={!acknowledged || isLoading || (rules && rules.length === 0)}
          loading={starting}
        >
          I understand — start session
        </Button>
      </div>

      <p className="text-xs text-ink-soft mt-4 text-right">
        macOS will prompt for your password to enable network restrictions.
      </p>
    </div>
  );
};
