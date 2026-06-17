import React, { useTransition, useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Session } from "better-auth";
import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";
import type { CandidateDocument } from "@workspace/db/schema";
import { resetCacheForCandidateAiScreenings } from "~/lib/actions/reset-cache";

// Predefined prompt templates
const PROMPT_TEMPLATES = [
  {
    id: "general",
    label: "General Analysis",
    prompt:
      "Provide a comprehensive analysis of the candidate's overall suitability, including their background, skills, experience, and potential fit for the role.",
  },
  {
    id: "technical-skills",
    label: "Technical Skills Assessment",
    prompt:
      "Focus on evaluating the candidate's technical skills, programming languages, tools, and technologies mentioned in their documents. Assess their depth of knowledge and practical experience.",
  },
  {
    id: "experience-fit",
    label: "Experience & Background Fit",
    prompt:
      "Analyze the candidate's work experience, previous roles, and how well their background aligns with the position requirements. Highlight relevant experience and any gaps.",
  },
  {
    id: "communication",
    label: "Communication & Writing Skills",
    prompt:
      "Evaluate the candidate's communication skills based on their cover letter, resume, and any written materials. Assess clarity, professionalism, and ability to articulate ideas.",
  },
  {
    id: "leadership",
    label: "Leadership & Management Potential",
    prompt:
      "Assess the candidate's leadership experience, management capabilities, and potential to lead teams or projects. Look for examples of taking initiative and driving results.",
  },
  {
    id: "culture-fit",
    label: "Culture & Team Fit",
    prompt:
      "Evaluate how well the candidate might fit into the company culture and work environment. Consider their work style, values, and ability to collaborate effectively.",
  },
  {
    id: "strengths-weaknesses",
    label: "Strengths & Areas for Growth",
    prompt:
      "Identify the candidate's key strengths and areas where they might need development or support. Provide a balanced assessment of their capabilities.",
  },
  {
    id: "custom",
    label: "Custom Prompt",
    prompt: "",
  },
] as const;

interface CandidateAiAnalysisProps {
  candidateId: string;
  positionId: string;
  session: Session;
  documents: CandidateDocument[];
}

export default function CandidateAiAnalysis({
  candidateId,
  positionId,
  session,
  documents,
}: CandidateAiAnalysisProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId],
    );
  };

  const handleSelectAll = () => {
    const documentsWithFileSearch = documents.filter(
      (doc) => doc.fileSearchDocumentName,
    );
    if (selectedDocumentIds.length === documentsWithFileSearch.length) {
      setSelectedDocumentIds([]);
    } else {
      setSelectedDocumentIds(documentsWithFileSearch.map((doc) => doc.id));
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
    if (template && template.prompt) {
      setCustomPrompt(template.prompt);
    } else {
      setCustomPrompt("");
    }
  };

  const handleAnalyze = () => {
    startTransition(async () => {
      setError(null);

      // Validate that at least one document is selected
      if (selectedDocumentIds.length === 0) {
        setError("Please select at least one document to analyze.");
        toast.error("Please select at least one document to analyze");
        return;
      }

      try {
        const requestBody: {
          positionId: string;
          documentIds: string[];
          customPrompt?: string;
        } = {
          positionId,
          documentIds: selectedDocumentIds,
        };

        // Only include customPrompt if provided
        if (customPrompt.trim()) {
          requestBody.customPrompt = customPrompt.trim();
        }

        const response = await fetch(
          `/api/candidate/${candidateId}/ai-analysis`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to analyze candidate");
        }

        await response.json();

        toast.success("Analysis completed and saved");

        // Navigate to AI Screenings tab
        const params = new URLSearchParams(searchParams);
        params.set("tab", "ai-screenings");
        setSearchParams(params);

        // Invalidate cache tags immediately after successful analysis
        // This ensures the UI reflects the change right away
        resetCacheForCandidateAiScreenings({ data: candidateId });
      } catch (err) {
        console.error("Error analyzing candidate", err);
        toast.error("An error occurred during analysis");
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred during analysis",
        );
      }
    });
  };

  const documentsWithFileSearch = documents.filter(
    (doc) => doc.fileSearchDocumentName,
  );
  const allSelected =
    documentsWithFileSearch.length > 0 &&
    selectedDocumentIds.length === documentsWithFileSearch.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-xl font-semibold">AI Analysis</h2>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Get AI-powered insights and analysis for this candidate based on their
          profile, applications, and interview data. The analysis will be
          automatically saved and can be viewed in the AI Screenings tab.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Document Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Select Documents to Analyze{" "}
              <span className="text-destructive">*</span>
            </Label>
            {documentsWithFileSearch.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
          {documentsWithFileSearch.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 border rounded-lg text-center bg-muted/30">
              <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p>No documents available for analysis.</p>
              <p className="text-xs mt-1">
                Documents need to be uploaded to the file search store to be
                analyzed.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/30">
              {documentsWithFileSearch.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-background transition-colors border border-transparent hover:border-border"
                >
                  <Checkbox
                    id={`doc-${document.id}`}
                    checked={selectedDocumentIds.includes(document.id)}
                    onCheckedChange={() => handleDocumentToggle(document.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`doc-${document.id}`}
                    className="flex-1 cursor-pointer text-sm space-y-1"
                  >
                    <div className="font-medium text-foreground">
                      {document.name}
                    </div>
                    {document.description && (
                      <div className="text-xs text-muted-foreground">
                        {document.description}
                      </div>
                    )}
                    {document.category && (
                      <div className="text-xs text-muted-foreground">
                        Category: {document.category}
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
          {documentsWithFileSearch.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedDocumentIds.length === 0
                ? "Please select at least one document to proceed with the analysis."
                : `${selectedDocumentIds.length} document(s) selected for analysis.`}
            </p>
          )}
        </div>

        {/* Right Column: Prompt Selection */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prompt-template" className="text-sm font-medium">
              Analysis Focus (Optional)
            </Label>
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger id="prompt-template" className="w-full">
                <SelectValue placeholder="Select a template or write custom" />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                Custom Questions or Requirements
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="Add any specific questions or requirements you want the AI to address in the analysis. For example: 'Focus on the candidate's experience with Python and machine learning' or 'Evaluate their communication skills based on the cover letter'..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          )}

          {selectedTemplate !== "custom" && customPrompt && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Template</Label>
              <div className="p-3 bg-muted/30 border rounded-lg">
                <p className="text-sm text-foreground">{customPrompt}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedTemplate("custom");
                  setCustomPrompt("");
                }}
                className="text-xs"
              >
                Use custom prompt instead
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {selectedTemplate === "custom"
              ? "Add specific questions or focus areas for the AI analysis. Leave empty for a general analysis."
              : "You can modify the template text above or switch to a custom prompt."}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleAnalyze}
          disabled={
            isPending ||
            selectedDocumentIds.length === 0 ||
            documentsWithFileSearch.length === 0
          }
          className="w-full sm:w-auto"
        >
          {isPending ? (
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
        {selectedDocumentIds.length === 0 &&
          documentsWithFileSearch.length > 0 && (
            <p className="text-xs text-destructive">
              Please select at least one document to proceed
            </p>
          )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
