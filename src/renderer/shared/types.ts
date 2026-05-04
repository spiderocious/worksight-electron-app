export type SubmissionType = 'link' | 'text' | 'both';

export interface CandidateMe {
  candidate: { id: string; name: string; email: string };
  pending: PendingItem[];
  inProgress: InProgressItem[];
  closed: ClosedItem[];
  completed: CompletedItem[];
  topBarStatus: string;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  brief: string;
  submissionType: SubmissionType;
  durationMinutes: number;
  // Present when the reviewer chose to hide the real test until the candidate
  // clicks Start. The session screen renders these instead of `title`/`brief`.
  hideUntilStart?: boolean;
  mainTitle?: string | null;
  mainBrief?: string | null;
}

export interface PendingItem {
  id: string;
  assignmentId: string;
  candidateId: string;
  status: 'pending';
  deadline: string | null;
  // Server-computed: ms until the deadline. Negative = effectively closed.
  closesInMs: number | null;
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

export interface ClosedItem {
  id: string;
  assignmentId: string;
  status: 'closed';
  deadline: string | null;
  createdAt: string;
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
