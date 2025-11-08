"use client";

import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  Eye,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface InterviewDetailCardProps {
  interview: {
    id: string;
    status: "scheduled" | "completed" | "cancelled";
    scheduledAt: Date | null;
    overallFeedback: string | null;
    roundTemplate: {
      id: string;
      name: string;
      description: string | null;
    };
    stageOrder: number;
    interviewer: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  };
  applicationId: string;
  isSelected?: boolean;
}

export default function InterviewDetailCard({
  interview,
  applicationId,
  isSelected,
}: InterviewDetailCardProps) {
  const getStatusIcon = () => {
    switch (interview.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const statusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    scheduled: "outline",
    completed: "default",
    cancelled: "destructive",
  };

  return (
    <Card className={isSelected ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <h3 className="font-semibold text-base">
                Stage {interview.stageOrder}: {interview.roundTemplate.name}
              </h3>
              <Badge
                variant={statusColors[interview.status] || "outline"}
                className="text-xs"
              >
                {interview.status}
              </Badge>
            </div>
            {interview.roundTemplate.description && (
              <p className="text-sm text-muted-foreground">
                {interview.roundTemplate.description}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/interviews/${interview.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Link>
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-3">
          {interview.scheduledAt && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Scheduled:</span>
              <span className="font-medium">
                {formatDate(interview.scheduledAt)}
              </span>
            </div>
          )}
          {interview.interviewer && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Interviewer:</span>
              <span className="font-medium">
                {interview.interviewer.name || interview.interviewer.email}
              </span>
            </div>
          )}
          {interview.overallFeedback && (
            <div className="pt-2">
              <div className="flex items-start gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground block mb-1">
                    Overall Feedback:
                  </span>
                  <p className="text-foreground whitespace-pre-wrap">
                    {interview.overallFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
