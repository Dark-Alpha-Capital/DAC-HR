"use client";

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Loader2, Sparkles } from 'lucide-react';
import { analyzeCandidate, pollAnalysis } from '@/lib/ai-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AnalyzeCandidateButtonProps {
  applicationId: string;
  candidateName?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function AnalyzeCandidateButton({
  applicationId,
  candidateName,
  variant = 'default',
  size = 'default',
}: AnalyzeCandidateButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const router = useRouter();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress('Starting analysis...');

    try {
      // Trigger analysis
      const response = await analyzeCandidate(applicationId);

      if (!response.success || !response.analysisId) {
        toast.error(response.error || 'Failed to start analysis');
        setIsAnalyzing(false);
        return;
      }

      toast.success('Analysis started!', {
        description: `Analyzing ${candidateName || 'candidate'}...`,
      });

      setProgress('Analyzing candidate...');

      // Poll for completion
      const result = await pollAnalysis(response.analysisId, (update) => {
        if (update.status === 'processing') {
          setProgress('Processing documents and extracting insights...');
        }
      });

      if (!result) {
        toast.error('Analysis timed out');
        setIsAnalyzing(false);
        return;
      }

      if (result.status === 'failed') {
        toast.error('Analysis failed', {
          description: result.errorMessage || 'Unknown error',
        });
        setIsAnalyzing(false);
        return;
      }

      if (result.status === 'completed') {
        toast.success('Analysis complete!', {
          description: `Score: ${result.overallScore}/100`,
        });

        // Refresh the page to show results
        router.refresh();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzing(false);
      setProgress('');
    }
  };

  return (
    <Button
      onClick={handleAnalyze}
      disabled={isAnalyzing}
      variant={variant}
      size={size}
      className="gap-2"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">{progress || 'Analyzing...'}</span>
          <span className="sm:hidden">Analyzing...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>Analyze with AI</span>
        </>
      )}
    </Button>
  );
}
