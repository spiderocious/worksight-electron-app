import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/services/api-client';
import type { CandidateMe } from '@shared/types';

export const candidateMeKey = ['candidate-me'] as const;

export const useCandidateMe = () =>
  useQuery({
    queryKey: candidateMeKey,
    queryFn: () => api<CandidateMe>('/candidate/me'),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

export const useInvalidateMe = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: candidateMeKey });
};
