import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScreenerOption {
  id: string;
  name: string;
}

interface InterviewAiAnalysisTabProps {
  interviewId: string;
  onAnalysisComplete?: () => void;
}

export default function InterviewAiAnalysisTab({
  interviewId,
  onAnalysisComplete,
}: InterviewAiAnalysisTabProps) {
  const [screeners, setScreeners] = useState<ScreenerOption[]>([]);
  const [screenersLoading, setScreenersLoading] = useState(true);
  const [screenerId, setScreenerId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchScreeners = async () => {
      try {
        const response = await fetch("/api/screeners");
        if (response.ok) {
          const data = (await response.json()) as {
            screeners?: ScreenerOption[];
          };
          setScreeners(data.screeners ?? []);
        }
      } catch (error) {
        console.error("Error fetching screeners:", error);
      } finally {
        setScreenersLoading(false);
      }
    };
    void fetchScreeners();
  }, []);

  const runAnalysis = async () => {
    if (!screenerId) {
      toast.error("Please select a screener");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/interview/${interviewId}/ai-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenerId,
            customPrompt: customPrompt.trim() || undefined,
          }),
        },
      );

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
          Analyze candidate responses against a screener rubric. Works for both
          manual interviews and AI session responses.
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
