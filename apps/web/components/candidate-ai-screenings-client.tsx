"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CandidateAiScreening } from "@workspace/db/schema";
import { deleteAiScreening } from "@/lib/actions/delete-ai-screening";
import {
  updateAiScreening,
  type UpdateAiScreeningInput,
} from "@/lib/actions/update-ai-screening";

// Type for structured data
type StructuredScreeningData = {
  verdict: "Strong Hire" | "Hire" | "Neutral / On the Fence" | "Do Not Hire";
  score: number; // 0-10
  explanation: string;
  fullAnalysis: string;
};

interface CandidateAiScreeningsClientProps {
  screenings: CandidateAiScreening[];
  positionId: string | null;
}

// Helper function to safely extract structured data
function getStructuredData(
  screening: CandidateAiScreening
): StructuredScreeningData | null {
  if (
    !screening.structuredData ||
    typeof screening.structuredData !== "object" ||
    screening.structuredData === null
  ) {
    return null;
  }

  const data = screening.structuredData as any;

  // Check if it's the new simplified format
  if (
    typeof data.verdict === "string" &&
    typeof data.score === "number" &&
    typeof data.explanation === "string" &&
    typeof data.fullAnalysis === "string"
  ) {
    return {
      verdict: data.verdict,
      score: data.score,
      explanation: data.explanation,
      fullAnalysis: data.fullAnalysis,
    };
  }

  // Backward compatibility: try to extract from old format
  if (data.overallVerdict?.recommendation) {
    return {
      verdict: data.overallVerdict.recommendation,
      score: 5, // Default score for old format
      explanation:
        data.overallVerdict.justification || "No explanation available",
      fullAnalysis: data.fullAnalysis || screening.analysis || "",
    };
  }

  return null;
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
        : null
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
      const result = await deleteAiScreening(selectedScreening.id, candidateId);

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
          (s) => s.id !== selectedScreening.id
        );

        if (remainingScreenings.length > 0) {
          setSelectedScreening(remainingScreenings[0] as CandidateAiScreening);
        } else {
          setSelectedScreening(null);
        }

        router.refresh();
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
      const structuredData = getStructuredData(selectedScreening);

      const updateData: UpdateAiScreeningInput = {
        screeningId: selectedScreening.id,
        candidateId,
        analysis: editAnalysis.trim(),
        structuredData: structuredData || null,
      };

      const result = await updateAiScreening(updateData);

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

        router.refresh();
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
                  const structuredData = getStructuredData(screening);
                  const getVerdictColor = (verdict: string) => {
                    if (verdict === "Strong Hire")
                      return "bg-green-500/10 text-green-700 border-green-500/20";
                    if (verdict === "Hire")
                      return "bg-blue-500/10 text-blue-700 border-blue-500/20";
                    if (verdict === "Neutral / On the Fence")
                      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
                    return "bg-red-500/10 text-red-700 border-red-500/20";
                  };

                  const getScoreColor = (score: number) => {
                    if (score >= 8) return "text-green-600";
                    if (score >= 6) return "text-blue-600";
                    if (score >= 4) return "text-yellow-600";
                    return "text-red-600";
                  };

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
                          {structuredData && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getVerdictColor(structuredData.verdict)}`}
                              >
                                {structuredData.verdict}
                              </Badge>
                              <span
                                className={`text-sm font-semibold ${getScoreColor(structuredData.score)}`}
                              >
                                {structuredData.score}/10
                              </span>
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
          {selectedScreening && (
            <div className="space-y-6">
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Screening Details
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
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
                    <div className="space-y-4 pr-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Generated</span>
                        <span className="font-medium">
                          {formatDate(selectedScreening.createdAt)}
                        </span>
                      </div>
                      {selectedScreening.model && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-medium">
                            {selectedScreening.model}
                          </span>
                        </div>
                      )}

                      {(() => {
                        const structuredData =
                          getStructuredData(selectedScreening);
                        return structuredData ? (
                          <StructuredDataDisplay data={structuredData} />
                        ) : null;
                      })()}

                      <div className="pt-4 border-t">
                        <h3 className="text-sm font-medium mb-3">
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
          )}
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
              variant="outline"
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

function StructuredDataDisplay({ data }: { data: StructuredScreeningData }) {
  const getVerdictColor = (verdict: string) => {
    if (verdict === "Strong Hire")
      return "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400";
    if (verdict === "Hire")
      return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";
    if (verdict === "Neutral / On the Fence")
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400";
    return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-blue-600 dark:text-blue-400";
    if (score >= 4) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict === "Strong Hire" || verdict === "Hire") {
      return (
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      );
    }
    if (verdict === "Do Not Hire") {
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
    return (
      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Verdict and Score Card */}
      <div
        className="p-5 rounded-lg border-2 shadow-sm"
        style={{
          backgroundColor:
            data.verdict === "Strong Hire"
              ? "rgba(34, 197, 94, 0.1)"
              : data.verdict === "Hire"
                ? "rgba(59, 130, 246, 0.1)"
                : data.verdict === "Neutral / On the Fence"
                  ? "rgba(234, 179, 8, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
          borderColor:
            data.verdict === "Strong Hire"
              ? "rgba(34, 197, 94, 0.3)"
              : data.verdict === "Hire"
                ? "rgba(59, 130, 246, 0.3)"
                : data.verdict === "Neutral / On the Fence"
                  ? "rgba(234, 179, 8, 0.3)"
                  : "rgba(239, 68, 68, 0.3)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          {getVerdictIcon(data.verdict)}
          <h3 className="text-base font-semibold">Assessment Summary</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge
            variant="outline"
            className={`text-sm font-medium py-1 px-2 ${getVerdictColor(data.verdict)}`}
          >
            {data.verdict}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">
              Score:
            </span>
            <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}
            </span>
            <span
              className={`text-sm font-medium ${getScoreColor(data.score)}`}
            >
              /10
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50">
          <p className="text-sm leading-relaxed text-foreground">
            {data.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
