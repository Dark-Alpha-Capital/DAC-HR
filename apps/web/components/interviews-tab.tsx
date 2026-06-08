import React, { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { CheckCircle2, Circle, ChevronRight, Save, Clock } from "lucide-react";

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applications: any[];
};

type InterviewRound = {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "completed";
  scheduledAt?: Date;
  feedback?: string;
  proceedToNextRound?: boolean | null;
  questions: string[];
  responses: Record<string, string>;
};

export default function InterviewsTab({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [rounds, setRounds] = useState<InterviewRound[]>([
    {
      id: "screening",
      name: "Screening",
      status: "not-started",
      questions: [
        "Tell us about your background and experience",
        "Why are you interested in this position?",
        "What are your salary expectations?",
        "When can you start?",
      ],
      responses: {},
    },
    {
      id: "technical",
      name: "Technical",
      status: "not-started",
      questions: [
        "Describe your technical expertise in relevant technologies",
        "Walk us through a challenging project you've worked on",
        "How do you approach problem-solving?",
        "What's your experience with our tech stack?",
      ],
      responses: {},
    },
    {
      id: "final-executive",
      name: "Final Executive",
      status: "not-started",
      questions: [
        "What are your long-term career goals?",
        "How do you handle conflict in a team?",
        "What are your thoughts on our company culture?",
        "Do you have any questions for us?",
      ],
      responses: {},
    },
  ]);

  const [activeRound, setActiveRound] = useState<string>("screening");
  const [isSaving, setIsSaving] = useState(false);

  const currentRound = rounds.find((r) => r.id === activeRound);
  const currentRoundIndex = rounds.findIndex((r) => r.id === activeRound);

  const handleStartRound = (roundId: string) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId ? { ...r, status: "in-progress" as const } : r,
      ),
    );
  };

  const handleSaveRound = async () => {
    if (!currentRound) return;

    setIsSaving(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setRounds((prev) =>
        prev.map((r) =>
          r.id === currentRound.id ? { ...r, status: "completed" as const } : r,
        ),
      );

      // Show success toast
      toast.success("Interview round saved successfully!", {
        description: `${currentRound.name} round has been saved and marked as completed.`,
      });

      // Wait a moment for the toast to be visible, then redirect
      setTimeout(() => {
        router.navigate({ to: "/candidates", search: {} as any });
      }, 1000);
    } catch (error) {
      toast.error("Failed to save interview round", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResponseChange = (questionIndex: number, value: string) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.id === activeRound
          ? {
              ...r,
              responses: {
                ...r.responses,
                [questionIndex]: value,
              },
            }
          : r,
      ),
    );
  };

  const handleFeedbackChange = (value: string) => {
    setRounds((prev) =>
      prev.map((r) => (r.id === activeRound ? { ...r, feedback: value } : r)),
    );
  };

  const handleProceedChange = (value: string) => {
    const proceed = value === "yes" ? true : value === "no" ? false : null;
    setRounds((prev) =>
      prev.map((r) =>
        r.id === activeRound ? { ...r, proceedToNextRound: proceed } : r,
      ),
    );
  };

  const getRoundIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRoundStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Check if we should show "proceed to next round" field
  const showProceedField =
    currentRound &&
    (currentRound.id === "screening" || currentRound.id === "technical");

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Interview Rounds</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Manage candidate interviews across three stages: Screening,
            Technical, and Final Executive
          </p>
        </CardHeader>
        <CardContent>
          {/* Round Progress Overview */}
          <div className="flex items-center justify-between mb-8 p-4 bg-accent/30 rounded-lg">
            {rounds.map((round, index) => (
              <React.Fragment key={round.id}>
                <div className="flex flex-col items-center gap-2">
                  {getRoundIcon(round.status)}
                  <span className="text-sm font-medium">{round.name}</span>
                  <Badge variant={getRoundStatusColor(round.status) as any}>
                    {round.status === "not-started"
                      ? "Not Started"
                      : round.status === "in-progress"
                        ? "In Progress"
                        : "Completed"}
                  </Badge>
                </div>
                {index < rounds.length - 1 && (
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Round Tabs */}
          <Tabs value={activeRound} onValueChange={setActiveRound}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="screening">Screening</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="final-executive">Final Executive</TabsTrigger>
            </TabsList>

            {rounds.map((round) => (
              <TabsContent
                key={round.id}
                value={round.id}
                className="mt-6 space-y-6"
              >
                {round.status === "not-started" ? (
                  <Card className="border-dashed">
                    <CardContent className="pt-6 text-center py-12">
                      <Circle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold text-lg mb-2">
                        {round.name} Round Not Started
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Click the button below to start this interview round
                      </p>
                      <Button onClick={() => handleStartRound(round.id)}>
                        Start {round.name} Round
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Interview Questions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Interview Questions & Responses
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {round.questions.map((question, index) => (
                          <div key={index} className="space-y-3">
                            <Label className="text-base font-semibold">
                              {index + 1}. {question}
                            </Label>
                            <Textarea
                              placeholder="Enter candidate's response and your assessment..."
                              value={round.responses[index] || ""}
                              onChange={(e) =>
                                handleResponseChange(index, e.target.value)
                              }
                              rows={4}
                              className="resize-none"
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Overall Feedback */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Overall Feedback
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Provide your overall assessment of the candidate's performance in this round..."
                          value={round.feedback || ""}
                          onChange={(e) => handleFeedbackChange(e.target.value)}
                          rows={6}
                          className="resize-none"
                        />
                      </CardContent>
                    </Card>

                    {/* Proceed to Next Round - Only for Screening and Technical */}
                    {showProceedField && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Decision</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Label className="text-base mb-4 block">
                            Should this candidate proceed to the next round?
                          </Label>
                          <RadioGroup
                            value={
                              round.proceedToNextRound === true
                                ? "yes"
                                : round.proceedToNextRound === false
                                  ? "no"
                                  : ""
                            }
                            onValueChange={handleProceedChange}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="yes"
                                id={`${round.id}-yes`}
                              />
                              <Label
                                htmlFor={`${round.id}-yes`}
                                className="cursor-pointer"
                              >
                                Yes - Proceed to next round
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="no"
                                id={`${round.id}-no`}
                              />
                              <Label
                                htmlFor={`${round.id}-no`}
                                className="cursor-pointer"
                              >
                                No - Do not proceed
                              </Label>
                            </div>
                          </RadioGroup>
                        </CardContent>
                      </Card>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                      <Button
                        onClick={handleSaveRound}
                        disabled={isSaving}
                        size="lg"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Round"}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
