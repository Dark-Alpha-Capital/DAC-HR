import { analyzeWithClaudeJSON } from './claude';
import { POSITION_MATCHING_PROMPT, fillPrompt } from '../utils/prompts';
import type { ExtractedSkill } from './skills-extractor';
import type { ParsedDocument } from './document-parser';

export type Enthusiasm = 'low' | 'medium' | 'high';

export interface PositionMatchResult {
  skillsMatchScore: number;
  experienceMatchScore: number;
  cultureFitScore: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  detailedReport: string;
  sentimentScore: number;
  enthusiasm: Enthusiasm;
  experienceYears: number;
  educationLevel: string;
}

/**
 * Match candidate to position using AI analysis
 */
export async function matchCandidateToPosition(
  candidateData: {
    parsedResume: ParsedDocument;
    coverLetterText?: string;
    skills: ExtractedSkill[];
    candidateName: string;
    candidateEmail: string;
  },
  positionData: {
    name: string;
    description: string | null;
  }
): Promise<{ match: PositionMatchResult; tokensUsed: number; processingTimeMs: number }> {
  const candidateJSON = JSON.stringify({
    name: candidateData.candidateName,
    email: candidateData.candidateEmail,
    resume: candidateData.parsedResume,
    coverLetter: candidateData.coverLetterText,
    extractedSkills: candidateData.skills,
  }, null, 2);

  const prompt = fillPrompt(POSITION_MATCHING_PROMPT, {
    CANDIDATE_DATA: candidateJSON,
    POSITION_NAME: positionData.name,
    POSITION_DESCRIPTION: positionData.description || 'No description provided',
  });

  const systemPrompt = `You are an expert HR analyst with deep experience in talent assessment.
Provide objective, data-driven evaluations.
Always return valid JSON only, no additional text.`;

  const result = await analyzeWithClaudeJSON<PositionMatchResult>(prompt, systemPrompt);

  return {
    match: result.data,
    tokensUsed: result.tokensUsed,
    processingTimeMs: result.processingTimeMs,
  };
}

/**
 * Calculate composite score from individual scores
 */
export function calculateCompositeScore(match: PositionMatchResult): number {
  return (
    match.skillsMatchScore * 0.35 +      // 35% weight
    match.experienceMatchScore * 0.30 +  // 30% weight
    match.overallScore * 0.20 +          // 20% weight
    match.cultureFitScore * 0.15         // 15% weight
  );
}
