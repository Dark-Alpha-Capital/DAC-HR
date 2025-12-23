/**
 * Client-side utilities for calling the AI Analysis API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface AnalysisResponse {
  success: boolean;
  analysisId?: string;
  status?: string;
  estimatedTime?: number;
  error?: string;
}

export interface AnalysisResult {
  id: string;
  applicationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overallScore?: number;
  skillsMatchScore?: number;
  experienceMatchScore?: number;
  cultureFitScore?: number;
  summary?: string;
  strengths?: string[];
  concerns?: string[];
  detailedReport?: string;
  skills?: Array<{
    skillName: string;
    category: string;
    proficiencyLevel: string;
    yearsOfExperience?: number;
  }>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankedCandidate {
  rank: number;
  tier: 'top' | 'qualified' | 'consider';
  applicationId: string;
  candidateName: string;
  score: number;
  breakdown: {
    skills: number;
    experience: number;
    overall: number;
    culture: number;
  };
}

export interface RankingsResponse {
  positionId: string;
  rankings: RankedCandidate[];
  statistics: {
    totalCandidates: number;
    averageScore: number;
    topScore: number;
    lowestScore: number;
    tierDistribution: {
      top: number;
      qualified: number;
      consider: number;
    };
  };
  generatedAt: string;
}

/**
 * Trigger AI analysis for a candidate application
 */
export async function analyzeCandidate(applicationId: string): Promise<AnalysisResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analyze-candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicationId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to trigger analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger analysis',
    };
  }
}

/**
 * Get analysis results by analysis ID
 */
export async function getAnalysis(analysisId: string): Promise<AnalysisResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analysis/${analysisId}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get analysis:', error);
    return null;
  }
}

/**
 * Get analysis by application ID
 */
export async function getAnalysisByApplication(applicationId: string): Promise<AnalysisResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analysis/application/${applicationId}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get analysis:', error);
    return null;
  }
}

/**
 * Get rankings for a position
 */
export async function getRankings(positionId: string): Promise<RankingsResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/rankings/${positionId}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get rankings:', error);
    return null;
  }
}

/**
 * Poll for analysis completion
 */
export async function pollAnalysis(
  analysisId: string,
  onUpdate?: (result: AnalysisResult) => void,
  maxAttempts = 60
): Promise<AnalysisResult | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getAnalysis(analysisId);

    if (!result) {
      return null;
    }

    if (onUpdate) {
      onUpdate(result);
    }

    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return null;
}
