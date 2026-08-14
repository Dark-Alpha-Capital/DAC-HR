import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { screenersListQueryOptions } from "#/features/interviews/interview-queries";

interface ScreenerOption {
  id: string;
  name: string;
}

type InterviewAiAnalysisTabProps = {
  onAnalysisComplete?: () => void;
  screeners?: ScreenerOption[];
  defaultScreenerId?: string;
} & (
  | { interviewId: string; bundleId?: never }
  | { bundleId: string; interviewId?: never }
);

export default function InterviewAiAnalysisTab({
  interviewId,
  bundleId,
  screeners: screenersProp,
  defaultScreenerId,
  onAnalysisComplete,
}: InterviewAiAnalysisTabProps) {
  const { data: screenersData, isLoading: screenersQueryLoading } = useQuery({
    ...screenersListQueryOptions(),
    enabled: !screenersProp,
  });

  const screeners =
    screenersProp ??
    screenersData?.screeners.map((screener) => ({
      id: screener.id,
      name: screener.name,
    })) ??
    [];
  const screenersLoading = !screenersProp && screenersQueryLoading;

  const [screenerId, setScreenerId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (defaultScreenerId && !screenerId) {
      setScreenerId(defaultScreenerId);
    }
  }, [defaultScreenerId, screenerId]);

  const positionScreenerPreselected =
    defaultScreenerId && screenerId === defaultScreenerId;

  const analysisEndpoint = bundleId
    ? `/api/interview-bundle/${bundleId}/ai-analysis`
    : `/api/interview/${interviewId}/ai-analysis`;

  const runAnalysis = async () => {
    if (!screenerId) {
      toast.error("Please select a screener");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(analysisEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenerId,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "Failed to run analysis");
      }

      toast.success("Analysis completed — view it in the Screenings tab");
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
          {bundleId
            ? "Analyze candidate responses across every round in this position interview — voice and form — against a screener rubric."
            : "Analyze candidate responses against a screener rubric. Works for both manual interviews and AI session responses."}
        </p>
      </div>

      <div className="space-y-4 max-w-xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="screener">Screener</Label>
          {screenersLoading ? (
            <div className="h-10 rounded-md border bg-muted/40 animate-pulse" />
          ) : screeners.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              <p>No screeners available.</p>
              <Button asChild variant="link" className="mt-1 h-auto p-0">
                <Link to="/screeners/new">Create a screener</Link>
              </Button>
            </div>
          ) : (
            <Select value={screenerId} onValueChange={setScreenerId}>
              <SelectTrigger id="screener">
                <SelectValue placeholder="Select a screener" />
              </SelectTrigger>
              <SelectContent>
                {screeners.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            {positionScreenerPreselected
              ? "This position's screener is preselected — analysis will use it automatically when the interview completes."
              : "Attach a screener to a position to have analysis run automatically on completion."}{" "}
            <Link to="/screeners" className="underline underline-offset-2">
              Manage screeners
            </Link>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
          <Textarea
            id="customPrompt"
            placeholder="Add any specific areas you want the AI to focus on..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          onClick={runAnalysis}
          disabled={isLoading || screenersLoading || !screenerId}
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
