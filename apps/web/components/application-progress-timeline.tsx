"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  Star,
  Eye,
  Calendar,
  User,
  FileText,
  Plus,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import RecordInterviewDialogWrapper from "./record-interview-dialog-wrapper";

interface Round {
  id: string;
  name: string;
  description: string | null;
  positionRoundTemplateId: string;
}

interface Interview {
  id: string;
  positionRoundTemplateId: string;
  status: "pending" | "move_forward" | "rejected" | "scheduled";
  rating: number | null;
  scheduledAt: Date | null;
  overallFeedback: string | null;
  createdAt: Date;
  roundTemplate: {
    id: string;
    name: string;
    description: string | null;
  };
  interviewer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ApplicationProgressTimelineProps {
  rounds: Round[];
  interviews: Interview[];
  applicationId?: string;
  selectedInterviewId?: string;
  currentUser?: {
    id: string;
  } | null;
  users?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  application?: {
    id: string;
    candidateId: string;
    positionId: string;
  };
}

export default function ApplicationProgressTimeline({
  rounds,
  interviews,
  applicationId,
  selectedInterviewId,
  currentUser,
  users = [],
  application,
}: ApplicationProgressTimelineProps) {
  const getInterviewForRound = (positionRoundTemplateId: string) => {
    return interviews.find(
      (i) => i.positionRoundTemplateId === positionRoundTemplateId
    );
  };

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case "move_forward":
        return {
          icon: CheckCircle2,
          iconColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          ringColor: "ring-emerald-500/20",
          connectorColor: "bg-emerald-500",
          badgeVariant: "default" as const,
          badgeClass:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          label: "Move Forward",
        };
      case "rejected":
        return {
          icon: XCircle,
          iconColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          borderColor: "border-red-200 dark:border-red-800",
          ringColor: "ring-red-500/20",
          connectorColor: "bg-red-500",
          badgeVariant: "destructive" as const,
          badgeClass:
            "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
          label: "Rejected",
        };
      case "scheduled":
        return {
          icon: Clock,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          borderColor: "border-blue-200 dark:border-blue-800",
          ringColor: "ring-blue-500/20",
          connectorColor: "bg-blue-500",
          badgeVariant: "secondary" as const,
          badgeClass:
            "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          label: "Scheduled",
        };
      default:
        return {
          icon: Circle,
          iconColor: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted-foreground/20",
          ringColor: "ring-muted-foreground/10",
          connectorColor: "bg-muted-foreground/20",
          badgeVariant: "outline" as const,
          badgeClass:
            "bg-muted/50 text-muted-foreground border-muted-foreground/20",
          label: "Pending",
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-linear-to-r from-primary to-primary/50 rounded-full" />
          <h2 className="text-xl font-semibold tracking-tight">
            Application Progress
          </h2>
        </div>
        {interviews.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {interviews.length} interview{interviews.length !== 1 ? "s" : ""}{" "}
            recorded
          </Badge>
        )}
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-4">No interview rounds configured.</p>
          {currentUser && application && (
            <RecordInterviewDialogWrapper
              applicationId={application.id}
              application={application as any}
              users={users}
              currentUserId={currentUser.id}
              trigger={
                <Button size="sm">
                  <Plus className="h-3 w-3 mr-2" />
                  Record Interview
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="relative">
          {rounds.map((round, index) => {
            const interview = getInterviewForRound(
              round.positionRoundTemplateId
            );
            const statusConfig = getStatusConfig(interview?.status);
            const isLast = index === rounds.length - 1;
            const Icon = statusConfig.icon;
            const hasInterview = !!interview;
            const isPending = !hasInterview;
            const isSelected = interview?.id === selectedInterviewId;

            return (
              <div key={round.id} className="relative">
                <div className="flex items-start gap-4 group">
                  {/* Timeline Connector & Icon */}
                  <div className="flex flex-col items-center relative z-10">
                    {/* Status Icon with enhanced styling */}
                    <div
                      className={cn(
                        "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                        "shadow-sm group-hover:shadow-md group-hover:scale-105",
                        statusConfig.bgColor,
                        statusConfig.borderColor,
                        statusConfig.ringColor,
                        "ring-4 ring-offset-2 ring-offset-background",
                        isSelected && "ring-primary ring-4"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-6 w-6 transition-all duration-300",
                          statusConfig.iconColor
                        )}
                      />
                      {/* Pulse animation for completed/rejected */}
                      {(interview?.status === "move_forward" ||
                        interview?.status === "rejected") && (
                        <span
                          className={cn(
                            "absolute inset-0 rounded-full animate-ping opacity-20",
                            interview?.status === "move_forward"
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          )}
                        />
                      )}
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 min-h-16 mt-2 transition-colors duration-300",
                          hasInterview
                            ? statusConfig.connectorColor
                            : "bg-linear-to-b from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/20"
                        )}
                      />
                    )}
                  </div>

                  {/* Round Content Card */}
                  <div className="flex-1 pb-8">
                    <div
                      className={cn(
                        "relative rounded-lg border p-4 transition-all duration-300",
                        "hover:shadow-md hover:border-opacity-60",
                        statusConfig.bgColor,
                        statusConfig.borderColor,
                        "border-opacity-50",
                        isPending && "opacity-75",
                        isSelected && "ring-2 ring-primary"
                      )}
                    >
                      {/* Content */}
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base text-foreground">
                                {round.name}
                              </h3>
                              <Badge
                                variant={statusConfig.badgeVariant}
                                className={cn(
                                  "text-xs font-medium px-2 py-0.5",
                                  statusConfig.badgeClass
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                              {interview?.rating && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-medium px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1"
                                >
                                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                  {interview.rating}/5
                                </Badge>
                              )}
                            </div>
                            {round.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {round.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Interview Details */}
                        {hasInterview && interview && (
                          <div className="pt-2 border-t border-border/50 space-y-3">
                            {/* Interview Information */}
                            <div className="space-y-2 text-sm">
                              {interview.scheduledAt && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    Scheduled:
                                  </span>
                                  <span className="font-medium">
                                    {formatDate(interview.scheduledAt)}
                                  </span>
                                </div>
                              )}
                              {interview.interviewer && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    Interviewer:
                                  </span>
                                  <span className="font-medium">
                                    {interview.interviewer.name ||
                                      interview.interviewer.email}
                                  </span>
                                </div>
                              )}
                              {interview.overallFeedback && (
                                <div className="pt-2 border-t">
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <span className="text-muted-foreground block mb-1 text-xs font-medium">
                                        Feedback:
                                      </span>
                                      <p className="text-foreground whitespace-pre-wrap text-sm">
                                        {interview.overallFeedback}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {applicationId && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/interviews/${interview.id}`}>
                                    <Eye className="h-3 w-3 mr-2" />
                                    View
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No Interview - Show Record Button */}
                        {!hasInterview && currentUser && application && (
                          <div className="pt-2 border-t border-border/50">
                            <RecordInterviewDialogWrapper
                              applicationId={application.id}
                              application={application as any}
                              users={users}
                              currentUserId={currentUser.id}
                              positionRoundTemplateId={
                                round.positionRoundTemplateId
                              }
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Plus className="h-3 w-3 mr-2" />
                                  Record Interview
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>

                      {/* Decorative corner accent */}
                      <div
                        className={cn(
                          "absolute top-0 right-0 w-20 h-20 opacity-5 rounded-bl-full transition-opacity duration-300",
                          interview?.status === "move_forward"
                            ? "bg-emerald-500"
                            : interview?.status === "rejected"
                              ? "bg-red-500"
                              : "bg-muted-foreground"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
