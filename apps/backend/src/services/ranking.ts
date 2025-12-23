import { calculateCompositeScore } from './position-matcher';

export type RankingTier = 'top' | 'qualified' | 'consider';

export interface RankedCandidate {
  rank: number;
  tier: RankingTier;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  score: number;
  breakdown: {
    skills: number;
    experience: number;
    overall: number;
    culture: number;
  };
}

export interface CandidateForRanking {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  analysis: {
    skillsMatchScore?: number | null;
    experienceMatchScore?: number | null;
    overallScore?: number | null;
    cultureFitScore?: number | null;
  };
}

/**
 * Generate rankings for candidates applying to a position
 */
export function generateRankings(candidates: CandidateForRanking[]): RankedCandidate[] {
  // Calculate composite scores
  const scoredCandidates = candidates.map(candidate => {
    const analysis = candidate.analysis;

    const compositeScore = (
      (analysis.skillsMatchScore || 0) * 0.35 +
      (analysis.experienceMatchScore || 0) * 0.30 +
      (analysis.overallScore || 0) * 0.20 +
      (analysis.cultureFitScore || 0) * 0.15
    );

    return {
      applicationId: candidate.applicationId,
      candidateId: candidate.candidateId,
      candidateName: candidate.candidateName,
      score: Math.round(compositeScore * 100) / 100, // Round to 2 decimal places
      breakdown: {
        skills: analysis.skillsMatchScore || 0,
        experience: analysis.experienceMatchScore || 0,
        overall: analysis.overallScore || 0,
        culture: analysis.cultureFitScore || 0,
      },
    };
  });

  // Sort by composite score (descending)
  const sorted = scoredCandidates.sort((a, b) => b.score - a.score);

  // Add ranking position and tier
  const ranked: RankedCandidate[] = sorted.map((item, index) => {
    let tier: RankingTier;

    if (index < 3) {
      tier = 'top';
    } else if (index < 10) {
      tier = 'qualified';
    } else {
      tier = 'consider';
    }

    return {
      ...item,
      rank: index + 1,
      tier,
    };
  });

  return ranked;
}

/**
 * Get top N candidates
 */
export function getTopCandidates(rankings: RankedCandidate[], n: number = 5): RankedCandidate[] {
  return rankings.slice(0, n);
}

/**
 * Get candidates by tier
 */
export function getCandidatesByTier(rankings: RankedCandidate[], tier: RankingTier): RankedCandidate[] {
  return rankings.filter(candidate => candidate.tier === tier);
}

/**
 * Get ranking statistics
 */
export function getRankingStatistics(rankings: RankedCandidate[]): {
  totalCandidates: number;
  averageScore: number;
  topScore: number;
  lowestScore: number;
  tierDistribution: Record<RankingTier, number>;
} {
  if (rankings.length === 0) {
    return {
      totalCandidates: 0,
      averageScore: 0,
      topScore: 0,
      lowestScore: 0,
      tierDistribution: { top: 0, qualified: 0, consider: 0 },
    };
  }

  const scores = rankings.map(r => r.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const tierDistribution: Record<RankingTier, number> = {
    top: rankings.filter(r => r.tier === 'top').length,
    qualified: rankings.filter(r => r.tier === 'qualified').length,
    consider: rankings.filter(r => r.tier === 'consider').length,
  };

  return {
    totalCandidates: rankings.length,
    averageScore: Math.round(averageScore * 100) / 100,
    topScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    tierDistribution,
  };
}
