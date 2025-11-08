"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";

interface Round {
  id: string;
  name: string;
  description: string | null;
  stageOrder: number;
}

interface Interview {
  id: string;
  stageOrder: number;
  status: "scheduled" | "completed" | "cancelled";
  roundTemplate: {
    id: string;
    name: string;
  };
}

interface ApplicationProgressTimelineProps {
  rounds: Round[];
  currentStage: number;
  interviews: Interview[];
}

export default function ApplicationProgressTimeline({
  rounds,
  currentStage,
  interviews,
}: ApplicationProgressTimelineProps) {
  const getStageStatus = (stageOrder: number) => {
    if (stageOrder < currentStage) return "completed";
    if (stageOrder === currentStage) return "current";
    return "pending";
  };

  const getInterviewForStage = (stageOrder: number) => {
    return interviews.find((i) => i.stageOrder === stageOrder);
  };

  const sortedRounds = [...rounds].sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Application Progress</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-6">
          {sortedRounds.map((round, index) => {
            const status = getStageStatus(round.stageOrder);
            const interview = getInterviewForStage(round.stageOrder);
            const isLast = index === sortedRounds.length - 1;

            return (
              <div key={round.id} className="relative">
                <div className="flex items-start gap-4">
                  {/* Stage Icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        status === "completed"
                          ? "bg-primary border-primary text-primary-foreground"
                          : status === "current"
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : status === "current" ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-full min-h-12 mt-2 ${
                          status === "completed"
                            ? "bg-primary"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base">
                            Stage {round.stageOrder}: {round.name}
                          </h3>
                          <Badge
                            variant={
                              status === "completed"
                                ? "default"
                                : status === "current"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {status === "completed"
                              ? "Completed"
                              : status === "current"
                              ? "Current"
                              : "Pending"}
                          </Badge>
                        </div>
                        {round.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {round.description}
                          </p>
                        )}
                        {interview && (
                          <div className="mt-2">
                            <Badge
                              variant={
                                interview.status === "completed"
                                  ? "default"
                                  : interview.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              Interview: {interview.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

