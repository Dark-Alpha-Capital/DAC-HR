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
import { Eye, Pencil, FileText } from "lucide-react";
import type { Document } from "@workspace/db/schema";
import DeleteDocumentButton from "./delete-document-button";
import DocumentPreviewDialog from "./document-preview-dialog";
import { isNew } from "~/lib/utils";

interface DocumentCardProps {
  document: Document;
}

const categoryColors = {
  "job-description": "default",
  onboarding: "secondary",
  policy: "secondary",
  "hr-form": "default",
  other: "destructive",
} as const;

const categoryLabels = {
  "job-description": "Job Description",
  onboarding: "Onboarding",
  policy: "Policy",
  "hr-form": "HR Form",
  other: "Other",
} as const;

const DocumentCard = ({ document }: DocumentCardProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
          <div className="flex items-center gap-1.5 shrink-0">
            {isNew(document.createdAt) && (
              <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                New
              </Badge>
            )}
            <Badge variant={categoryColor}>{categoryLabel}</Badge>
          </div>
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
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>

          <DeleteDocumentButton documentId={document.id} />
        </div>
      </CardFooter>

      <DocumentPreviewDialog
        document={document}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </Card>
  );
};

export default DocumentCard;
