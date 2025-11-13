"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Calendar, Edit, Star, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import InterviewSummaryForm from "./interview-summary-form";

type InterviewStatus = "pending" | "complete";

interface InterviewSummaryDisplayProps {
  interview: {
    id: string;
    status: InterviewStatus;
    rating: number | null;
    scheduledAt: Date | null;
    overallFeedback: string | null;
  };
  applicationId: string;
}

export default function InterviewSummaryDisplay({
  interview,
  applicationId,
}: InterviewSummaryDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when interview data changes (after successful save)
  useEffect(() => {
    setIsEditing(false);
  }, [interview.id, interview.overallFeedback, interview.rating, interview.status, interview.scheduledAt]);

  const hasDetails =
    interview.rating !== null ||
    interview.scheduledAt !== null ||
    (interview.overallFeedback && interview.overallFeedback.trim() !== "");

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Interview Summary</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <InterviewSummaryForm
          interview={interview}
          applicationId={applicationId}
        />
      </div>
    );
  }

  if (!hasDetails) {
    return (
      <div className="text-center py-8 space-y-4">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            No interview summary recorded yet
          </p>
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Add Summary
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Interview Summary</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Status:
          </span>
          <Badge
            variant={interview.status === "complete" ? "default" : "outline"}
          >
            {interview.status.charAt(0).toUpperCase() +
              interview.status.slice(1)}
          </Badge>
        </div>

        {/* Rating */}
        {interview.rating !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
              Rating:
            </span>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{interview.rating}/5</span>
            </div>
          </div>
        )}

        {/* Interview Date */}
        {interview.scheduledAt && (
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
              Interview Date:
            </span>
            <span className="text-sm">{formatDate(interview.scheduledAt)}</span>
          </div>
        )}

        {/* Overall Feedback */}
        {interview.overallFeedback &&
          interview.overallFeedback.trim() !== "" && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Overall Feedback:
                </span>
                <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-4 rounded-md">
                  {interview.overallFeedback}
                </p>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

