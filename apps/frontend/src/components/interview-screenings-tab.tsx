import { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  MessageSquare,
  History,
  Trash2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { formatDate } from "~/lib/utils";
import type { InterviewAiAnalysisData } from "~/lib/schemas/interview-ai-analysis-schema";

type InterviewScreeningsTabProps = {
  onRefresh?: () => void;
} & (
  | { interviewId: string; bundleId?: never }
  | { bundleId: string; interviewId?: never }
);

interface StoredAnalysis {
  id: string;
  interviewId: string;
  applicationId: string | null;
  positionId: string | null;
  screenerId: string | null;
  screenerName: string | null;
  analysis: string;
  structuredData: InterviewAiAnalysisData | null;
  customPrompt: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

const recommendationConfig = {
  "Strong Hire": {
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
  },
  Hire: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
  Neutral: {
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: AlertCircle,
  },
  "Do Not Hire": {
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
};

const performanceLevelConfig = {
  Excellent:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Good: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Adequate:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Poor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function ScoreDisplay({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 8) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 6) return "text-green-600 dark:text-green-400";
    if (s >= 4) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="text-center">
      <div className={cn("text-3xl font-bold", getScoreColor(score))}>
        {score.toFixed(1)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function AnalysisDisplay({ analysis }: { analysis: InterviewAiAnalysisData }) {
  const RecIcon =
    recommendationConfig[analysis.recommendation]?.icon || AlertCircle;

  return (
    <div className="space-y-6">
      {/* Header with score and recommendation */}
      <div className="flex items-center gap-6">
        <ScoreDisplay score={analysis.score} label="Overall Score" />
        <div className="h-12 w-px bg-border" />
        <Badge
          className={cn(
            "text-sm px-3 py-1",
            recommendationConfig[analysis.recommendation]?.color,
          )}
        >
          <RecIcon className="h-4 w-4 mr-1.5" />
          {analysis.recommendation}
        </Badge>
      </div>

      {/* Performance & Position Fit Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Interview Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {analysis.interviewPerformance.score.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {analysis.interviewPerformance.assessment}
            </p>
            {analysis.interviewPerformance.highlights.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Highlights
                </p>
                <ul className="text-sm space-y-1">
                  {analysis.interviewPerformance.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.interviewPerformance.concerns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Concerns
                </p>
                <ul className="text-sm space-y-1">
                  {analysis.interviewPerformance.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Position Fit
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {analysis.positionFit.score.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {analysis.positionFit.assessment}
            </p>
            {analysis.positionFit.alignedRequirements.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Aligned Requirements
                </p>
                <ul className="text-sm space-y-1">
                  {analysis.positionFit.alignedRequirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.positionFit.gaps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Gaps
                </p>
                <ul className="text-sm space-y-1">
                  {analysis.positionFit.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question Analysis */}
      {analysis.questionAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.questionAnalysis.map((qa, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{qa.questionSummary}</p>
                    <Badge
                      className={cn(
                        "text-xs shrink-0",
                        performanceLevelConfig[qa.performanceLevel],
                      )}
                    >
                      {qa.performanceLevel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{qa.notes}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.overallSummary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InterviewScreeningsTab({
  interviewId,
  bundleId,
}: InterviewScreeningsTabProps) {
  const [isFetching, setIsFetching] = useState(true);
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<StoredAnalysis | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const analysisEndpoint = bundleId
    ? `/api/interview-bundle/${bundleId}/ai-analysis`
    : `/api/interview/${interviewId}/ai-analysis`;

  const fetchAnalyses = useCallback(async () => {
    try {
      const response = await fetch(analysisEndpoint);
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
    } finally {
      setIsFetching(false);
    }
  }, [analysisEndpoint]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const deleteAnalysis = async (analysisId: string) => {
    setDeletingId(analysisId);
    try {
      const response = await fetch(analysisEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete analysis");
      }

      toast.success("Screening deleted");
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      if (selectedAnalysis?.id === analysisId) {
        setSelectedAnalysis(null);
      }
    } catch (error) {
      console.error("Error deleting analysis:", error);
      toast.error("Failed to delete screening");
    } finally {
      setDeletingId(null);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Viewing a specific analysis
  if (selectedAnalysis) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedAnalysis(null)}
            className="-ml-2"
          >
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Back to Screenings
          </Button>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(new Date(selectedAnalysis.createdAt))}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Screening</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this screening? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAnalysis(selectedAnalysis.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {selectedAnalysis.customPrompt && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Custom Instructions
            </p>
            <p className="text-sm">{selectedAnalysis.customPrompt}</p>
          </div>
        )}
        {selectedAnalysis.screenerName ? (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Screener
            </p>
            <p className="text-sm font-medium">{selectedAnalysis.screenerName}</p>
          </div>
        ) : null}
        {selectedAnalysis.structuredData && (
          <AnalysisDisplay analysis={selectedAnalysis.structuredData} />
        )}
      </div>
    );
  }

  // List view
  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No screenings yet</p>
        <p className="text-sm mt-1">
          Run an AI analysis to generate a screening
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((a) => {
        const data = a.structuredData;
        const RecIcon = data
          ? recommendationConfig[data.recommendation]?.icon || AlertCircle
          : AlertCircle;

        return (
          <div
            key={a.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedAnalysis(a)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-3">
                  {data && (
                    <>
                      <div className="text-2xl font-bold">
                        {data.score.toFixed(1)}
                      </div>
                      <Badge
                        className={cn(
                          "text-xs",
                          recommendationConfig[data.recommendation]?.color,
                        )}
                      >
                        <RecIcon className="h-3 w-3 mr-1" />
                        {data.recommendation}
                      </Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(new Date(a.createdAt))}
                  {a.screenerName ? (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {a.screenerName}
                    </span>
                  ) : null}
                  {a.customPrompt ? (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      Custom prompt
                    </span>
                  ) : null}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedAnalysis(a)}
                >
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Screening</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this screening? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAnalysis(a.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
