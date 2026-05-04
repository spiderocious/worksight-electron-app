export type SubmissionType = 'link' | 'text' | 'both';

export interface CandidateMe {
  candidate: { id: string; name: string; email: string };
  pending: PendingItem[];
  inProgress: InProgressItem[];
  completed: CompletedItem[];
  topBarStatus: string;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  brief: string;
  submissionType: SubmissionType;
  durationMinutes: number;
}

export interface PendingItem {
  id: string;
  assignmentId: string;
  candidateId: string;
  status: 'pending';
  deadline: string | null;
  createdAt: string;
  assignment: AssignmentSummary;
}

export interface InProgressItem {
  id: string;
  assignmentId: string;
  status: 'in_progress';
  sessionId: string;
  expiresAt: string;
  assignment: AssignmentSummary;
}

export interface CompletedItem {
  instance: { id: string; status: 'submitted' | 'scored'; createdAt: string };
  assignment: AssignmentSummary;
  sessionId: string;
  score: { numericScore: number; feedback: string } | null;
}

export interface InstanceFull {
  instance: PendingItem | { id: string; status: string; createdAt: string };
  assignment: AssignmentSummary;
}
