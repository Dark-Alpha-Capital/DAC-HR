import { z } from 'zod';

/**
 * Validation schemas for API requests
 */

export const analyzeCandidateSchema = z.object({
  applicationId: z.string().uuid(),
});

export const analyzeBatchSchema = z.object({
  positionId: z.string().uuid(),
  applicationIds: z.array(z.string().uuid()).optional(),
});

export const getRankingsSchema = z.object({
  positionId: z.string().uuid(),
});

export const getAnalysisSchema = z.object({
  id: z.string().uuid(),
});

export type AnalyzeCandidateInput = z.infer<typeof analyzeCandidateSchema>;
export type AnalyzeBatchInput = z.infer<typeof analyzeBatchSchema>;
export type GetRankingsInput = z.infer<typeof getRankingsSchema>;
export type GetAnalysisInput = z.infer<typeof getAnalysisSchema>;
