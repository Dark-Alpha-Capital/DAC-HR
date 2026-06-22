import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Eye, Pencil, FileText, Loader2 } from "lucide-react";
import type { CandidateDocument } from "@workspace/db/schema";
import DeleteCandidateDocumentButton from "./delete-candidate-document-button";
import { toast } from "sonner";

interface CandidateDocumentCardProps {
  document: CandidateDocument;
  candidateId: string;
}

const categoryColors = {
  resume: "default",
  "cover-letter": "secondary",
  portfolio: "secondary",
  other: "destructive",
} as const;

const categoryLabels = {
  resume: "Resume",
  "cover-letter": "Cover Letter",
  portfolio: "Portfolio",
  other: "Other",
} as const;

const CandidateDocumentCard = ({
  document,
  candidateId,
}: CandidateDocumentCardProps) => {
  const [isLoadingViewUrl, setIsLoadingViewUrl] = useState(false);

  const categoryColor =
    categoryColors[document.category] || categoryColors.other;
  const categoryLabel =
    categoryLabels[document.category] || categoryLabels.other;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewDocument = async () => {
    setIsLoadingViewUrl(true);
    try {
      // Check if URL is already a public URL (not GCS)
      const isPublicUrl =
        !document.url.includes("storage.googleapis.com") &&
        !document.url.startsWith("gs://");

      if (isPublicUrl) {
        // If it's already a public URL, open it directly
        window.open(document.url, "_blank", "noopener,noreferrer");
        setIsLoadingViewUrl(false);
        return;
      }

      // For GCS URLs, get a signed URL
      const response = await fetch(
        `/api/documents/view?url=${encodeURIComponent(document.url)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate access URL");
      }

      const { url: signedUrl } = await response.json();
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open document. Please try again.",
        {
          position: "bottom-right",
        },
      );
    } finally {
      setIsLoadingViewUrl(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <CardTitle className="text-lg line-clamp-2">
              {document.name}
            </CardTitle>
          </div>
          <Badge variant={categoryColor} className="shrink-0">
            {categoryLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-sm">
          {document.description && (
            <p className="text-muted-foreground line-clamp-3">
              {document.description}
            </p>
          )}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="pt-2 border-t space-y-1">
            <p className="text-xs text-muted-foreground">
              Created: {formatDate(document.createdAt)}
            </p>
            {document.updatedAt &&
              document.updatedAt.getTime() !== document.createdAt.getTime() && (
                <p className="text-xs text-muted-foreground">
                  Updated: {formatDate(document.updatedAt)}
                </p>
              )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewDocument}
            disabled={isLoadingViewUrl}
          >
            {isLoadingViewUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            View
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/candidates/${candidateId}/documents/${document.id}/edit` as any}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteCandidateDocumentButton
            documentId={document.id}
            candidateId={candidateId}
          />
        </div>
      </CardFooter>
    </Card>
  );
};

export default CandidateDocumentCard;
