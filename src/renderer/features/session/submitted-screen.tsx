import { useQuery } from '@tanstack/react-query';
import { Button, Spinner } from '@shared/ui';
import { CheckCircle2 } from '@shared/ui/icons';
import { api } from '@shared/services/api-client';

interface CandidateSettings {
  postSubmissionTitle: string;
  postSubmissionDescription: string;
  showScreenshotWarning: boolean;
}

const FALLBACK_TITLE = 'Submission received';
const FALLBACK_DESCRIPTION =
  'Network restrictions have been lifted. Your reviewer will see the screenshots and your submission, and will get back to you with feedback.';

export const SubmittedScreen = ({ onContinue }: { onContinue: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['candidate-settings'],
    queryFn: () => api<CandidateSettings>('/candidate/settings'),
    staleTime: 60_000,
  });

  const title = data?.postSubmissionTitle ?? FALLBACK_TITLE;
  const description = data?.postSubmissionDescription ?? FALLBACK_DESCRIPTION;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-6">
          <CheckCircle2 size={28} />
        </div>
        {isLoading ? (
          <Spinner size={20} className="text-brand-700" />
        ) : (
          <>
            <h1 className="font-display text-3xl tracking-tight">{title}</h1>
            <p className="text-sm text-ink-muted mt-3 leading-relaxed">{description}</p>
          </>
        )}
        <div className="mt-8">
          <Button onClick={onContinue}>Back to assignments</Button>
        </div>
      </div>
    </div>
  );
};
