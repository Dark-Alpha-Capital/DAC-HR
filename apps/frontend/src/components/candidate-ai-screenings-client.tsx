import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Sparkles,
  Clock,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Code,
  Users,
} from "lucide-react";
import { formatDate } from "~/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import type { CandidateAiScreening } from "@workspace/db/schema";
import { deleteAiScreening } from "~/lib/actions/delete-ai-screening";
import {
  updateAiScreening,
  type UpdateAiScreeningInput,
} from "~/lib/actions/update-ai-screening";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// Full structured data type based on candidateAiScreeningSchema
type StructuredScreeningData = {
  score: number; // 0-10
  recommendation?: "Strong Hire" | "Hire" | "Neutral" | "Do Not Hire";
  strengths?: Array<{ title: string; description: string }>;
  concerns?: Array<{
    title: string;
    description: string;
    severity: "Low" | "Medium" | "High";
  }>;
  experienceFit?: {
    score: number;
    assessment: string;
    relevantExperience: string[];
    gaps: string[];
  };
  skillsFit?: {
    score: number;
    assessment: string;
    strongSkills: string[];
    developingSkills: string[];
  };
  cultureFit?: {
    score: number;
    assessment: string;
    indicators: string[];
  };
  analysis?: string;
};

interface CandidateAiScreeningsClientProps {
  screenings: CandidateAiScreening[];
  positionId: string | null;
}

// Helper function to safely extract structured data
function getStructuredData(
  screening: CandidateAiScreening,
): StructuredScreeningData | null {
  if (
    !screening.structuredData ||
    typeof screening.structuredData !== "object" ||
    screening.structuredData === null
  ) {
    return null;
  }

  return screening.structuredData as StructuredScreeningData;
}

// Helper function to safely extract score from structured data
function getScore(screening: CandidateAiScreening): number | null {
  const data = getStructuredData(screening);
  return data?.score ?? null;
}

// Helper to get score color
function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-blue-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
}

// Helper to get recommendation badge variant
function getRecommendationVariant(
  recommendation?: string,
): "default" | "secondary" | "destructive" {
  switch (recommendation) {
    case "Strong Hire":
      return "default";
    case "Hire":
      return "secondary";
    case "Neutral":
      return "secondary";
    case "Do Not Hire":
      return "destructive";
    default:
      return "secondary";
  }
}

// Helper to get severity color
function getSeverityColor(severity: string): string {
  switch (severity) {
    case "High":
      return "text-red-600";
    case "Medium":
      return "text-yellow-600";
    case "Low":
      return "text-blue-600";
    default:
      return "text-muted-foreground";
  }
}

export default function CandidateAiScreeningsClient({
  screenings,
  positionId,
}: CandidateAiScreeningsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAnalysis, setEditAnalysis] = useState("");

  // Convert date strings to Date objects if needed (Next.js serializes dates)
  const screeningsWithDates = screenings.map((s) => ({
    ...s,
    createdAt:
      s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
    updatedAt:
      s.updatedAt instanceof Date ? s.updatedAt : new Date(s.updatedAt),
  }));

  const [selectedScreening, setSelectedScreening] =
    useState<CandidateAiScreening | null>(
      screeningsWithDates.length > 0
        ? (screeningsWithDates[0] as CandidateAiScreening)
        : null,
    );

  const candidateId =
    screeningsWithDates.length > 0 && screeningsWithDates[0]
      ? screeningsWithDates[0].candidateId
      : null;

  const handleSelectScreening = (screening: CandidateAiScreening) => {
    setSelectedScreening({
      ...screening,
      createdAt:
        screening.createdAt instanceof Date
          ? screening.createdAt
          : new Date(screening.createdAt),
      updatedAt:
        screening.updatedAt instanceof Date
          ? screening.updatedAt
          : new Date(screening.updatedAt),
    });
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedScreening || !candidateId) return;

    startTransition(async () => {
      const result = await deleteAiScreening({
        data: [selectedScreening.id, candidateId],
      });

      if (result.error) {
        toast.error(result.error, {
          position: "bottom-right",
        });
      } else {
        toast.success("AI screening deleted successfully", {
          position: "bottom-right",
        });
        setDeleteDialogOpen(false);

        // Remove deleted screening from list and select next one
        const remainingScreenings = screeningsWithDates.filter(
          (s) => s.id !== selectedScreening.id,
        );

        if (remainingScreenings.length > 0) {
          setSelectedScreening(remainingScreenings[0] as CandidateAiScreening);
        } else {
          setSelectedScreening(null);
        }

        router.invalidate();
      }
    });
  };

  const handleEditClick = () => {
    if (!selectedScreening) return;
    setEditAnalysis(selectedScreening.analysis);
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!selectedScreening || !candidateId) return;

    if (!editAnalysis.trim()) {
      toast.error("Analysis cannot be empty", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      // Preserve existing structuredData as-is since we're only editing the analysis text
      // Omit structuredData to keep it unchanged (the action will preserve existing data)
      const updateData: UpdateAiScreeningInput = {
        screeningId: selectedScreening.id,
        candidateId,
        analysis: editAnalysis.trim(),
        // Don't include structuredData - action will preserve existing data
      };

      const result = await updateAiScreening({ data: updateData });

      if (result.error) {
        toast.error(result.error, {
          position: "bottom-right",
        });
      } else {
        toast.success("AI screening updated successfully", {
          position: "bottom-right",
        });
        setEditDialogOpen(false);

        // Update the selected screening with new data
        if (result.data) {
          setSelectedScreening({
            ...result.data,
            createdAt:
              result.data.createdAt instanceof Date
                ? result.data.createdAt
                : new Date(result.data.createdAt),
            updatedAt:
              result.data.updatedAt instanceof Date
                ? result.data.updatedAt
                : new Date(result.data.updatedAt),
          });
        }

        router.invalidate();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-lg font-semibold">AI Screenings</h2>
          {screeningsWithDates.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({screeningsWithDates.length}{" "}
              {screeningsWithDates.length === 1 ? "screening" : "screenings"})
            </span>
          )}
        </div>
      </div>

      {screeningsWithDates.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No AI screenings found for this candidate
                {positionId ? " and position" : ""}.
              </p>
              <p className="text-xs mt-2">
                Generate a new analysis in the "Do AI Analysis" tab to create
                your first screening.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Screenings List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Screenings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {screeningsWithDates.map((screening) => {
                  const score = getScore(screening);
                  const structuredData = getStructuredData(screening);

                  return (
                    <button
                      key={screening.id}
                      onClick={() => handleSelectScreening(screening)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selectedScreening?.id === screening.id
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">
                              {formatDate(screening.createdAt)}
                            </span>
                            {screening.model && (
                              <span className="text-xs text-muted-foreground">
                                ({screening.model})
                              </span>
                            )}
                          </div>
                          {score !== null && (
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-sm font-semibold ${getScoreColor(score)}`}
                              >
                                {score}/10
                              </span>
                              {structuredData?.recommendation && (
                                <Badge
                                  variant={getRecommendationVariant(
                                    structuredData.recommendation,
                                  )}
                                  className="text-xs"
                                >
                                  {structuredData.recommendation}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedScreening?.id === screening.id && (
                          <span className="text-xs text-primary shrink-0">
                            Viewing
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Screening Details */}
          {selectedScreening &&
            (() => {
              const structuredData = getStructuredData(selectedScreening);
              const score = getScore(selectedScreening);

              return (
                <div className="space-y-6">
                  <Card className="flex flex-col h-[600px]">
                    <CardHeader className="shrink-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Screening Details
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleEditClick}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteClick}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-6">
                      <ScrollArea className="h-full">
                        <div className="space-y-6 pr-4">
                          {/* Metadata */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Generated
                              </span>
                              <span className="font-medium">
                                {formatDate(selectedScreening.createdAt)}
                              </span>
                            </div>
                            {selectedScreening.model && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Model
                                </span>
                                <span className="font-medium">
                                  {selectedScreening.model}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Overall Assessment */}
                          {score !== null && (
                            <div className="pt-4 border-t">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Score:
                                  </span>
                                  <span
                                    className={`text-3xl font-bold ${getScoreColor(score)}`}
                                  >
                                    {score}/10
                                  </span>
                                </div>
                                {structuredData?.recommendation && (
                                  <Badge
                                    variant={getRecommendationVariant(
                                      structuredData.recommendation,
                                    )}
                                    className="text-sm px-3 py-1"
                                  >
                                    {structuredData.recommendation}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Strengths */}
                          {structuredData?.strengths &&
                            structuredData.strengths.length > 0 && (
                              <Collapsible
                                defaultOpen
                                className="border-t pt-4"
                              >
                                <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <h3 className="text-sm font-semibold">
                                      Strengths (
                                      {structuredData.strengths.length})
                                    </h3>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-3 space-y-3">
                                  {structuredData.strengths.map(
                                    (strength, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900/30"
                                      >
                                        <h4 className="text-sm font-medium mb-1">
                                          {strength.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                          {strength.description}
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}

                          {/* Concerns */}
                          {structuredData?.concerns &&
                            structuredData.concerns.length > 0 && (
                              <Collapsible
                                defaultOpen
                                className="border-t pt-4"
                              >
                                <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <h3 className="text-sm font-semibold">
                                      Concerns ({structuredData.concerns.length}
                                      )
                                    </h3>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-3 space-y-3">
                                  {structuredData.concerns.map(
                                    (concern, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900/30"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <h4 className="text-sm font-medium">
                                            {concern.title}
                                          </h4>
                                          <Badge
                                            variant="secondary"
                                            className={`text-xs ${getSeverityColor(concern.severity)}`}
                                          >
                                            {concern.severity}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {concern.description}
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}

                          {/* Experience Fit */}
                          {structuredData?.experienceFit && (
                            <Collapsible defaultOpen className="border-t pt-4">
                              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-blue-600" />
                                  <h3 className="text-sm font-semibold">
                                    Experience Fit
                                  </h3>
                                  <span
                                    className={`text-sm font-bold ${getScoreColor(structuredData.experienceFit.score)}`}
                                  >
                                    {structuredData.experienceFit.score}/10
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3 space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  {structuredData.experienceFit.assessment}
                                </p>
                                {structuredData.experienceFit.relevantExperience
                                  .length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium mb-2">
                                      Relevant Experience:
                                    </h4>
                                    <ul className="space-y-1">
                                      {structuredData.experienceFit.relevantExperience.map(
                                        (exp, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-muted-foreground flex items-start gap-2"
                                          >
                                            <span className="text-green-600 mt-1">
                                              •
                                            </span>
                                            <span>{exp}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {structuredData.experienceFit.gaps.length >
                                  0 && (
                                  <div>
                                    <h4 className="text-xs font-medium mb-2 text-yellow-600">
                                      Experience Gaps:
                                    </h4>
                                    <ul className="space-y-1">
                                      {structuredData.experienceFit.gaps.map(
                                        (gap, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-muted-foreground flex items-start gap-2"
                                          >
                                            <span className="text-yellow-600 mt-1">
                                              •
                                            </span>
                                            <span>{gap}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Skills Fit */}
                          {structuredData?.skillsFit && (
                            <Collapsible defaultOpen className="border-t pt-4">
                              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                                <div className="flex items-center gap-2">
                                  <Code className="h-4 w-4 text-purple-600" />
                                  <h3 className="text-sm font-semibold">
                                    Skills Fit
                                  </h3>
                                  <span
                                    className={`text-sm font-bold ${getScoreColor(structuredData.skillsFit.score)}`}
                                  >
                                    {structuredData.skillsFit.score}/10
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3 space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  {structuredData.skillsFit.assessment}
                                </p>
                                {structuredData.skillsFit.strongSkills.length >
                                  0 && (
                                  <div>
                                    <h4 className="text-xs font-medium mb-2">
                                      Strong Skills:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {structuredData.skillsFit.strongSkills.map(
                                        (skill, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {skill}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                                {structuredData.skillsFit.developingSkills
                                  .length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium mb-2 text-yellow-600">
                                      Skills to Develop:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {structuredData.skillsFit.developingSkills.map(
                                        (skill, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {skill}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Culture Fit */}
                          {structuredData?.cultureFit && (
                            <Collapsible defaultOpen className="border-t pt-4">
                              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-indigo-600" />
                                  <h3 className="text-sm font-semibold">
                                    Culture Fit
                                  </h3>
                                  <span
                                    className={`text-sm font-bold ${getScoreColor(structuredData.cultureFit.score)}`}
                                  >
                                    {structuredData.cultureFit.score}/10
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3 space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  {structuredData.cultureFit.assessment}
                                </p>
                                {structuredData.cultureFit.indicators.length >
                                  0 && (
                                  <div>
                                    <h4 className="text-xs font-medium mb-2">
                                      Indicators:
                                    </h4>
                                    <ul className="space-y-1">
                                      {structuredData.cultureFit.indicators.map(
                                        (indicator, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-muted-foreground flex items-start gap-2"
                                          >
                                            <span className="text-indigo-600 mt-1">
                                              •
                                            </span>
                                            <span>{indicator}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Full Analysis */}
                          <div className="pt-4 border-t">
                            <h3 className="text-sm font-semibold mb-3">
                              Full Analysis
                            </h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-li:text-foreground">
                              <ReactMarkdown>
                                {selectedScreening.analysis}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Screening?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this AI
              screening from the candidate's record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit AI Screening</DialogTitle>
            <DialogDescription>
              Update the analysis text for this AI screening. You can edit the
              markdown content below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <Label htmlFor="edit-analysis">Analysis</Label>
              <Textarea
                id="edit-analysis"
                value={editAnalysis}
                onChange={(e) => setEditAnalysis(e.target.value)}
                placeholder="Enter the AI analysis..."
                className="flex-1 min-h-[400px] resize-none font-mono text-sm"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
