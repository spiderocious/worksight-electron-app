import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, CardHeader, MarkdownBody, PageLoader } from '@shared/ui';
import { ArrowLeft, Clock } from '@shared/ui/icons';
import { api } from '@shared/services/api-client';
import type { InstanceFull } from '@shared/types';

interface Props {
  instanceId: string;
  onBack: () => void;
  onContinue: (instanceId: string) => void;
}

export const BriefScreen = ({ instanceId, onBack, onContinue }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['instance', instanceId],
    queryFn: () => api<InstanceFull>(`/candidate/assignments/${instanceId}`),
  });

  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="min-h-screen px-10 py-10 max-w-3xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back to assignments
      </button>

      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">{data.assignment.title}</h1>
        <div className="flex items-center gap-2 mt-3">
          <Badge tone="brand" icon={<Clock size={11} />}>
            {data.assignment.durationMinutes} minutes
          </Badge>
          <Badge tone="neutral">Submit: {data.assignment.submissionType}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader title="Brief" subtitle="Read carefully before you start." />
        <MarkdownBody>{data.assignment.brief}</MarkdownBody>
      </Card>

      <div className="mt-8 flex justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={() => onContinue(instanceId)}>Review the rules</Button>
      </div>
    </div>
  );
};
