import { useEffect, useState } from 'react';
import { Button, Card } from '@shared/ui';
import { ArrowLeft, Camera, ShieldAlert, AlertTriangle } from '@shared/ui/icons';
import { ws } from '@shared/window-api';
import type { ScreenPermissionStatus } from '../../../ipc/channels';

interface Props {
  onCancel: () => void;
  onGranted: () => void;
}

/**
 * Surfaced when the candidate tries to start a session without macOS Screen
 * Recording permission for WorkSight. Walks them through the OS-level grant
 * step + the relaunch macOS requires.
 */
export const ScreenPermissionScreen = ({ onCancel, onGranted }: Props) => {
  const [status, setStatus] = useState<ScreenPermissionStatus>('not-determined');
  const [busy, setBusy] = useState(false);

  // Re-check on mount and whenever the window regains focus — covers the
  // case where the user just toggled the permission in System Settings.
  useEffect(() => {
    void ws()
      .permissions.screenStatus()
      .then(setStatus);
    const onFocus = () => {
      void ws()
        .permissions.screenStatus()
        .then((s) => {
          setStatus(s);
          if (s === 'granted') onGranted();
        });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [onGranted]);

  const triggerPrompt = async () => {
    setBusy(true);
    try {
      const result = await ws().permissions.requestScreen();
      setStatus(result);
      if (result === 'granted') onGranted();
    } finally {
      setBusy(false);
    }
  };

  const openSettings = async () => {
    await ws().permissions.openSettings();
  };

  const relaunch = async () => {
    await ws().app.relaunch();
  };

  return (
    <div className="min-h-screen px-10 py-10 max-w-2xl mx-auto">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-5">
          <Camera size={28} />
        </div>
        <h1 className="font-display text-3xl tracking-tight">
          WorkSight needs Screen Recording permission
        </h1>
      </div>

      {status === 'not-determined' ? (
        <Card className="space-y-4">
          <p className="text-sm text-ink-muted leading-relaxed">
            macOS will show a permission prompt. Click the button below — when
            the dialog appears, choose <strong>Open System Settings</strong>.
          </p>
          <div className="flex justify-end">
            <Button onClick={triggerPrompt} loading={busy}>
              Show the macOS permission prompt
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div className="flex items-start gap-3 text-sm text-ink-muted leading-relaxed">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700" />
            <p>
              Permission is currently{' '}
              <strong className="text-ink">{status}</strong>. Follow these steps to grant it.
            </p>
          </div>

          <ol className="space-y-4 text-sm text-ink leading-relaxed">
            <Step n={1}>
              Click <span className="font-medium">Open System Settings</span>.
            </Step>
            <Step n={2}>
              Scroll to <span className="font-mono text-xs">Screen &amp; System Audio Recording</span>.
            </Step>
            <Step n={3}>
              Toggle <span className="font-medium">WorkSight</span> on.
            </Step>
            <Step n={4}>
              Come back here and click <span className="font-medium">I've enabled it — relaunch WorkSight</span>.
              macOS requires a relaunch before the permission takes effect.
            </Step>
          </ol>

          <div className="ws-card p-4 bg-amber-50 border-amber-200 text-sm text-amber-900 flex items-start gap-3">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <p>
                Please click the button below to open System Settings. The permission prompt is triggered by macOS itself.
                If you don't see the toggle for WorkSight in System Settings, make sure to scroll all the way down to the "Screen &amp; System Audio Recording" section.
                When done, come back and click the relaunch button to apply the changes.0935
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={openSettings}>
              Open System Settings
            </Button>
            <Button onClick={relaunch}>I've enabled it — relaunch WorkSight</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-medium">
      {n}
    </span>
    <span className="pt-0.5">{children}</span>
  </li>
);
