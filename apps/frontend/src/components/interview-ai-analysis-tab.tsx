import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InterviewAiAnalysisTabProps {
  interviewId: string;
  onAnalysisComplete?: () => void;
}

export default function InterviewAiAnalysisTab({
  interviewId,
  onAnalysisComplete,
}: InterviewAiAnalysisTabProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/interview/${interviewId}/ai-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customPrompt: customPrompt.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to run analysis");
      }

      toast.success("Analysis completed - view it in the Screenings tab");
      setCustomPrompt("");
      onAnalysisComplete?.();
    } catch (error) {
      console.error("Error running analysis:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to run analysis",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="text-lg font-medium">AI Interview Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Generate an AI-powered analysis of this interview by evaluating the
          candidate's responses against the position requirements.
        </p>
      </div>

      <div className="space-y-4 max-w-xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
          <Textarea
            id="customPrompt"
            placeholder="Add any specific areas you want the AI to focus on, or additional context for the analysis..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            The AI will analyze interview feedback, ratings, and notes against
            the job requirements.
          </p>
        </div>

        <Button
          onClick={runAnalysis}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Interview...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
