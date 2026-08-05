import React, { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { CandidateDocument } from "@workspace/db/schema";
import DeleteCandidateDocumentButton from "./delete-candidate-document-button";
import { resolveDocumentAccessUrl } from "~/lib/documents/access";

interface CandidateDocumentTableProps {
  documents: CandidateDocument[];
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

interface CandidateDocumentTableRowProps {
  document: CandidateDocument;
  candidateId: string;
}

const documentDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const CandidateDocumentTableRow = ({
  document,
  candidateId,
}: CandidateDocumentTableRowProps) => {
  const [isLoadingViewUrl, setIsLoadingViewUrl] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const categoryColor =
    categoryColors[document.category] || categoryColors.other;
  const categoryLabel =
    categoryLabels[document.category] || categoryLabels.other;

  const formatDate = (date: Date) =>
    documentDateFormatter.format(new Date(date));

  const handleViewDocument = async () => {
    setIsLoadingViewUrl(true);
    try {
      const accessUrl = await resolveDocumentAccessUrl(document.url);
      window.open(accessUrl, "_blank", "noopener,noreferrer");
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

  const handleDownloadDocument = async () => {
    setIsDownloading(true);
    try {
      const accessUrl = await resolveDocumentAccessUrl(document.url);

      const response = await fetch(accessUrl);
      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = document.name || "document";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(blobUrl);
      window.document.body.removeChild(anchor);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download document. Please try again.",
        {
          position: "bottom-right",
        },
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="py-1.5 px-2 text-sm font-medium">
        <div className="max-w-xs truncate" title={document.name}>
          {document.name}
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-2 text-xs">
        <Badge variant={categoryColor}>{categoryLabel}</Badge>
      </TableCell>
      <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
        <div className="max-w-md truncate" title={document.description || ""}>
          {document.description || "-"}
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-2 text-xs text-muted-foreground">
        <div className="max-w-xs truncate">
          {document.tags && document.tags.length > 0
            ? document.tags.join(", ")
            : "-"}
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-2 text-xs text-muted-foreground">
        {formatDate(document.createdAt)}
      </TableCell>
      <TableCell className="py-1.5 px-2">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={handleViewDocument}
            disabled={isLoadingViewUrl}
            aria-label={`View ${document.name}`}
          >
            {isLoadingViewUrl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownloadDocument}
            disabled={isDownloading}
            aria-label={`Download ${document.name}`}
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>

          <DeleteCandidateDocumentButton
            documentId={document.id}
            candidateId={candidateId}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

const CandidateDocumentTable = ({
  documents,
  candidateId,
}: CandidateDocumentTableProps) => {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Category</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Description</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Tags</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
            <TableHead className="py-1.5 px-2 text-xs text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <CandidateDocumentTableRow
              key={document.id}
              document={document}
              candidateId={candidateId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CandidateDocumentTable;
