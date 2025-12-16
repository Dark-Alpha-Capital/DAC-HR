"use client";

import React, { useTransition, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Session } from "better-auth";

interface CandidateAiAnalysisProps {
  candidateId: string;
  positionId: string;
  session: Session;
}

export default function CandidateAiAnalysis({
  candidateId,
  positionId,
  session,
}: CandidateAiAnalysisProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAnalyze = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/candidate/${candidateId}/ai-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ positionId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze candidate");
      }

      await response.json();

      toast.success("Analysis completed and saved");

      // Navigate to AI Screenings tab
      const params = new URLSearchParams(searchParams);
      params.set("tab", "ai-screenings");

      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });

      // Refresh to ensure new data is loaded
      // Call refresh outside transition to avoid server-side timing issues
      requestAnimationFrame(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Error analyzing candidate", err);
      toast.error("An error occurred during analysis");
      setError(
        err instanceof Error ? err.message : "An error occurred during analysis"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <h2 className="text-lg font-semibold">Do AI Analysis</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get AI-powered insights and analysis for this candidate based on
            their profile, applications, and interview data. The analysis will
            be automatically saved and can be viewed in the AI Screenings tab.
          </p>

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || isPending}
            className="w-full sm:w-auto"
          >
            {isLoading || isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Analysis
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
