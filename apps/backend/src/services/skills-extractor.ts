import { analyzeWithClaudeJSON } from './claude';
import { SKILLS_EXTRACTION_PROMPT, fillPrompt } from '../utils/prompts';

export type SkillCategory = 'technical' | 'soft' | 'domain' | 'language' | 'tool' | 'other';
export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface ExtractedSkill {
  skillName: string;
  category: SkillCategory;
  proficiencyLevel: SkillProficiency;
  yearsOfExperience: number | null;
  source: 'resume' | 'cover_letter' | 'both';
  context: string;
}

/**
 * Extract skills from resume and cover letter using AI
 */
export async function extractSkills(
  resumeText: string,
  coverLetterText?: string
): Promise<{ skills: ExtractedSkill[]; tokensUsed: number; processingTimeMs: number }> {
  const prompt = fillPrompt(SKILLS_EXTRACTION_PROMPT, {
    RESUME: resumeText,
    COVER_LETTER: coverLetterText || 'N/A',
  });

  const systemPrompt = 'You are an expert skills analyst. Always return valid JSON array only, no additional text.';

  const result = await analyzeWithClaudeJSON<ExtractedSkill[]>(prompt, systemPrompt);

  return {
    skills: result.data,
    tokensUsed: result.tokensUsed,
    processingTimeMs: result.processingTimeMs,
  };
}

/**
 * Match candidate skills against position requirements
 */
export function matchSkillsToPosition(
  candidateSkills: ExtractedSkill[],
  positionRequirements: string
): {
  matchedSkills: ExtractedSkill[];
  unmatchedRequirements: string[];
  matchPercentage: number;
} {
  // This is a simple keyword matching
  // In production, you'd want more sophisticated matching
  const requirementKeywords = positionRequirements
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(word => word.length > 2);

  const candidateSkillNames = candidateSkills.map(s => s.skillName.toLowerCase());

  const matchedSkills = candidateSkills.filter(skill =>
    requirementKeywords.some(keyword =>
      skill.skillName.toLowerCase().includes(keyword) ||
      keyword.includes(skill.skillName.toLowerCase())
    )
  );

  const unmatchedRequirements = requirementKeywords.filter(keyword =>
    !candidateSkillNames.some(skill =>
      skill.includes(keyword) || keyword.includes(skill)
    )
  );

  const matchPercentage = requirementKeywords.length > 0
    ? (matchedSkills.length / requirementKeywords.length) * 100
    : 0;

  return {
    matchedSkills,
    unmatchedRequirements,
    matchPercentage,
  };
}
