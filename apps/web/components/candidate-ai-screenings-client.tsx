"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { CandidateAiScreening } from "@workspace/db/schema";

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
                  <CardTitle className="text-base">Screening Details</CardTitle>
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
