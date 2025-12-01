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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Round Feedback</h3>
      </div>

      <InterviewSummaryForm
        interview={interview}
        applicationId={applicationId}
      />
    </div>
  );
}
