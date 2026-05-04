import { useState } from 'react';
import { Button, Card } from '@shared/ui';
import {
  ArrowLeft,
  ShieldAlert,
  Hourglass,
  Camera,
  Lock,
  Activity,
} from '@shared/ui/icons';
import { useToast } from '@shared/hooks/use-toast';
import { ws } from '@shared/window-api';

interface Props {
  instanceId: string;
  onCancel: () => void;
  onStarted: (sessionId: string) => void;
}

const Rule = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="flex gap-4 py-4">
    <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-muted leading-relaxed mt-0.5">{body}</p>
    </div>
  </div>
);

export const RulesScreen = ({ instanceId, onCancel, onStarted }: Props) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);
  const { push } = useToast();

  const handleStart = async () => {
    setStarting(true);
    try {
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
          By starting this session, you agree to everything below. Make sure you read each
          item carefully — these restrictions are the whole point of WorkSight.
        </p>
      </header>

      <Card className="divide-y divide-line p-0 px-5">
        <Rule
          icon={<ShieldAlert size={18} />}
          title="AI tools and reference sites will be blocked"
          body="ChatGPT, Claude, Gemini, Copilot, Stack Overflow, MDN and similar sites will be unreachable on this Mac for the duration of the session. The block is enforced at the network level."
        />
        <Rule
          icon={<Hourglass size={18} />}
          title="The countdown cannot be paused"
          body="The timer runs on the WorkSight server. It will continue counting down even if the WorkSight app is closed or this Mac is restarted. When it reaches zero, the session is over."
        />
        <Rule
          icon={<Lock size={18} />}
          title="The app cannot be quit normally"
          body="Cmd+Q is intercepted while a session is active. To leave the session you must submit your work."
        />
        <Rule
          icon={<Camera size={18} />}
          title="Random screenshots will be captured"
          body="Your screen will be captured at random intervals between 1 and 4 minutes. Your reviewer will see these as part of evaluating your submission."
        />
        <Rule
          icon={<Activity size={18} />}
          title="Force-quitting will be flagged"
          body="If you force-quit WorkSight or restart the machine, the session is flagged as abnormally terminated. The server will still close the session at the deadline whether or not you submit."
        />
      </Card>

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
        <Button onClick={handleStart} disabled={!acknowledged} loading={starting}>
          I understand — start session
        </Button>
      </div>

      <p className="text-xs text-ink-soft mt-4 text-right">
        macOS will prompt for your password to enable network restrictions.
      </p>
    </div>
  );
};
