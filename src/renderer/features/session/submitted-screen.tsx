import { Button } from '@shared/ui';
import { CheckCircle2 } from '@shared/ui/icons';

export const SubmittedScreen = ({ onContinue }: { onContinue: () => void }) => (
  <div className="min-h-screen flex items-center justify-center px-6">
    <div className="max-w-md text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-6">
        <CheckCircle2 size={28} />
      </div>
      <h1 className="font-display text-3xl tracking-tight">Submission received</h1>
      <p className="text-sm text-ink-muted mt-3">
        Network restrictions have been lifted. Your reviewer will see the screenshots and your
        submission, and will get back to you with feedback.
      </p>
      <div className="mt-8">
        <Button onClick={onContinue}>Back to assignments</Button>
      </div>
    </div>
  </div>
);
