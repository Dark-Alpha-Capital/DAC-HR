"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Progress } from '@workspace/ui/components/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import type { AnalysisResult } from '@/lib/ai-client';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CandidateAnalysisResultsProps {
  analysis: AnalysisResult;
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-4xl font-bold ${getColor(score)}`}>
        {score}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <Progress value={score} className="w-24 h-2" />
    </div>
  );
}

function SkillBadge({ skill }: { skill: any }) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 text-blue-800';
      case 'soft':
        return 'bg-green-100 text-green-800';
      case 'domain':
        return 'bg-purple-100 text-purple-800';
      case 'language':
        return 'bg-orange-100 text-orange-800';
      case 'tool':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProficiencyIcon = (level: string) => {
    switch (level) {
      case 'expert':
        return '⭐⭐⭐';
      case 'advanced':
        return '⭐⭐';
      case 'intermediate':
        return '⭐';
      default:
        return '';
    }
  };

  return (
    <Badge variant="outline" className={`${getCategoryColor(skill.category)} border-0`}>
      {skill.skillName}
      {skill.proficiencyLevel && (
        <span className="ml-1 text-xs">
          {getProficiencyIcon(skill.proficiencyLevel)}
        </span>
      )}
      {skill.yearsOfExperience && (
        <span className="ml-1 text-xs opacity-75">
          ({skill.yearsOfExperience}y)
        </span>
      )}
    </Badge>
  );
}

export function CandidateAnalysisResults({ analysis }: CandidateAnalysisResultsProps) {
  if (analysis.status === 'pending' || analysis.status === 'processing') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            AI Analysis In Progress
          </CardTitle>
          <CardDescription>
            Processing candidate information and documents...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (analysis.status === 'failed') {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Analysis Failed
          </CardTitle>
          <CardDescription>
            {analysis.errorMessage || 'An error occurred during analysis'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis Results
          </CardTitle>
          <CardDescription>
            Comprehensive evaluation of candidate fit for this position
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Score Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <ScoreCircle score={analysis.overallScore || 0} label="Overall" />
            <ScoreCircle score={analysis.skillsMatchScore || 0} label="Skills" />
            <ScoreCircle score={analysis.experienceMatchScore || 0} label="Experience" />
            <ScoreCircle score={analysis.cultureFitScore || 0} label="Culture Fit" />
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="concerns">Concerns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Report</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.detailedReport ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{analysis.detailedReport}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No detailed report available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Skills</CardTitle>
              <CardDescription>
                {analysis.skills?.length || 0} skills identified and categorized
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.skills && analysis.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.skills.map((skill, index) => (
                    <SkillBadge key={index} skill={skill} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills extracted</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strengths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.strengths && analysis.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No strengths identified</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concerns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Areas of Concern
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.concerns && analysis.concerns.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.concerns.map((concern, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{concern}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No concerns identified</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
