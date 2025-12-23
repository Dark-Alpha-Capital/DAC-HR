"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Progress } from '@workspace/ui/components/progress';
import { Skeleton } from '@workspace/ui/components/skeleton';
import type { RankingsResponse } from '@/lib/ai-client';
import { getRankings } from '@/lib/ai-client';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface PositionRankingsProps {
  positionId: string;
}

function RankBadge({ rank, tier }: { rank: number; tier: 'top' | 'qualified' | 'consider' }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <Trophy className="h-5 w-5" />
        <span className="font-bold">#1</span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Medal className="h-5 w-5" />
        <span className="font-bold">#2</span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="flex items-center gap-1 text-orange-600">
        <Award className="h-5 w-5" />
        <span className="font-bold">#3</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <span className="font-semibold">#{rank}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: 'top' | 'qualified' | 'consider' }) {
  const styles = {
    top: 'bg-green-100 text-green-800 border-green-200',
    qualified: 'bg-blue-100 text-blue-800 border-blue-200',
    consider: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    top: 'Top Candidate',
    qualified: 'Qualified',
    consider: 'Consider',
  };

  return (
    <Badge variant="outline" className={styles[tier]}>
      {labels[tier]}
    </Badge>
  );
}

export function PositionRankings({ positionId }: PositionRankingsProps) {
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRankings() {
      try {
        const data = await getRankings(positionId);
        if (data) {
          setRankings(data);
        } else {
          setError('No rankings available yet');
        }
      } catch (err) {
        setError('Failed to load rankings');
      } finally {
        setIsLoading(false);
      }
    }

    loadRankings();
  }, [positionId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !rankings || rankings.rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidate Rankings</CardTitle>
          <CardDescription>
            {error || 'No analyzed candidates yet. Analyze candidates to see rankings.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-2xl font-bold">{rankings.statistics.totalCandidates}</div>
              <div className="text-xs text-muted-foreground text-center">
                Total Analyzed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="text-2xl font-bold">{rankings.statistics.topScore}</div>
              <div className="text-xs text-muted-foreground text-center">
                Top Score
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="text-2xl font-bold">
                {rankings.statistics.tierDistribution.top}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Top Tier
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2">
              <Award className="h-8 w-8 text-blue-600" />
              <div className="text-2xl font-bold">
                {rankings.statistics.averageScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Avg Score
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings List */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Rankings</CardTitle>
          <CardDescription>
            Ranked by overall fit score (composite of skills, experience, and culture fit)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankings.rankings.map((candidate) => (
              <Link
                key={candidate.applicationId}
                href={`/applications/${candidate.applicationId}`}
                className="block"
              >
                <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                  {/* Rank */}
                  <div className="w-12 flex-shrink-0">
                    <RankBadge rank={candidate.rank} tier={candidate.tier} />
                  </div>

                  {/* Candidate Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{candidate.candidateName}</h4>
                      <TierBadge tier={candidate.tier} />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Skills: {candidate.breakdown.skills}</span>
                      <span>Experience: {candidate.breakdown.experience}</span>
                      <span>Culture: {candidate.breakdown.culture}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-2xl font-bold">
                      {candidate.score.toFixed(1)}
                    </div>
                    <Progress value={candidate.score} className="w-24 h-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
