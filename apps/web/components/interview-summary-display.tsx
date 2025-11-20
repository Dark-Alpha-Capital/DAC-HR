"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Edit, Star, Plus } from "lucide-react";
import InterviewSummaryForm from "./interview-summary-form";

type InterviewStatus = "pending" | "move_forward" | "rejected" | "scheduled";

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
  }, [
    interview.id,
    interview.overallFeedback,
    interview.rating,
    interview.status,
  ]);

  const hasFeedback =
    interview.rating !== null ||
    (interview.overallFeedback && interview.overallFeedback.trim() !== "");

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {hasFeedback ? "Edit Round Feedback" : "Add Round Feedback"}
          </h3>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Round Feedback</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          {hasFeedback ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Feedback
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Feedback
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Status:
          </span>
          <Badge
            variant={
              interview.status === "move_forward"
                ? "default"
                : interview.status === "rejected"
                  ? "destructive"
                  : "outline"
            }
          >
            {interview.status === "move_forward"
              ? "Move Forward"
              : interview.status.charAt(0).toUpperCase() +
                interview.status.slice(1)}
          </Badge>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Rating:
          </span>
          {interview.rating !== null ? (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{interview.rating}/5</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              Not set
            </span>
          )}
        </div>

        {/* Overall Feedback */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            Overall Feedback:
          </span>
          {interview.overallFeedback &&
          interview.overallFeedback.trim() !== "" ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-4 rounded-md">
              {interview.overallFeedback}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-md">
              No feedback recorded yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
