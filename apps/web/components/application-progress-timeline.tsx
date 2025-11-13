"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";

interface Round {
  id: string;
  name: string;
  description: string | null;
  positionRoundTemplateId: string;
}

interface Interview {
  id: string;
  positionRoundTemplateId: string;
  status: "pending" | "complete";
  rating: number | null;
  roundTemplate: {
    id: string;
    name: string;
  };
}

interface ApplicationProgressTimelineProps {
  rounds: Round[];
  interviews: Interview[];
}

export default function ApplicationProgressTimeline({
  rounds,
  interviews,
}: ApplicationProgressTimelineProps) {
  const getInterviewForRound = (positionRoundTemplateId: string) => {
    return interviews.find((i) => i.positionRoundTemplateId === positionRoundTemplateId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Application Progress</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-6">
          {rounds.map((round, index) => {
            const interview = getInterviewForRound(round.positionRoundTemplateId);
            const isComplete = interview?.status === "complete";
            const isLast = index === rounds.length - 1;

            return (
              <div key={round.id} className="relative">
                <div className="flex items-start gap-4">
                  {/* Round Icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isComplete
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-muted border-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-full min-h-12 mt-2 ${
                          isComplete
                            ? "bg-primary"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>

                  {/* Round Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base">
                            {round.name}
                          </h3>
                          <Badge
                            variant={isComplete ? "default" : "outline"}
                            className="text-xs"
                          >
                            {isComplete ? "Complete" : "Pending"}
                          </Badge>
                          {interview?.rating && (
                            <Badge variant="secondary" className="text-xs">
                              {interview.rating}/5 ⭐
                            </Badge>
                          )}
                        </div>
                        {round.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {round.description}
                          </p>
                        )}
                        {interview && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            <Badge
                              variant={
                                interview.status === "complete"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {interview.status === "complete" ? "Complete" : "Pending"}
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

