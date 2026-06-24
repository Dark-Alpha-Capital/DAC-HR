
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Download, Loader2, Eye } from "lucide-react";
import DeleteDocumentButton from "~/components/delete-document-button";
import DeleteCandidateDocumentButton from "~/components/delete-candidate-document-button";
import DocumentPreviewDialog from "~/components/document-preview-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";
import type { UnifiedDocumentListItem } from "@workspace/db/document-list-filters";

const candidateCategoryLabels: Record<string, string> = {
  resume: "Resume",
  "cover-letter": "Cover Letter",
  portfolio: "Portfolio",
  other: "Other",
};

interface DocumentContainerProps {
  documents: UnifiedDocumentListItem[];
  showCandidateColumn?: boolean;
}

const DocumentContainer = ({
  documents,
  showCandidateColumn = false,
}: DocumentContainerProps) => {
  const [previewDocument, setPreviewDocument] =
    useState<UnifiedDocumentListItem | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownloadDocument = async (document: UnifiedDocumentListItem) => {
    setDownloadingDocId(document.id);
    try {
      const isPublicUrl =
        !document.url.includes("storage.googleapis.com") &&
        !document.url.startsWith("gs://");

      let accessUrl = document.url;

      if (!isPublicUrl) {
        const response = await fetch(
          `/api/documents/view?url=${encodeURIComponent(document.url)}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate access URL");
        }

        const { url: signedUrl } = await response.json();
        accessUrl = signedUrl;
      }

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
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download document. Please try again.",
      );
    } finally {
      setDownloadingDocId(null);
    }
  };

  const renderCategory = (document: UnifiedDocumentListItem) => {
    if (document.scope === "candidate") {
      const label =
        candidateCategoryLabels[document.candidateCategory ?? "other"] ??
        "Other";
      return <Badge variant="secondary">{label}</Badge>;
    }

    const categories = document.categories || [];
    if (categories.length === 0) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {cat.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
            {showCandidateColumn ? (
              <TableHead className="py-1.5 px-2 text-xs">Candidate</TableHead>
            ) : null}
            <TableHead className="py-1.5 px-2 text-xs">Category</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Description</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Tags</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
            <TableHead className="text-right py-1.5 px-2 text-xs">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document, index) => (
            <TableRow key={`${document.scope}-${document.id}`}>
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-1.5 px-2 font-medium text-sm">
                <div className="flex items-center gap-2">
                  {document.name}
                  {document.scope === "candidate" ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Candidate
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              {showCandidateColumn ? (
                <TableCell className="py-1.5 px-2 text-sm">
                  {document.candidateId && document.candidateName ? (
                    <Link
                      to="/candidates/$uid"
                      params={{ uid: document.candidateId }}
                      className="text-primary hover:underline"
                    >
                      {document.candidateName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              ) : null}
              <TableCell className="py-1.5 px-2 text-sm">
                {renderCategory(document)}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {document.description || "-"}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {document.tags && document.tags.length > 0
                  ? document.tags.join(", ")
                  : "-"}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {formatDate(document.createdAt)}
              </TableCell>
              <TableCell className="text-right py-1.5 px-2">
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setPreviewDocument(document)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDownloadDocument(document)}
                        disabled={downloadingDocId === document.id}
                      >
                        {downloadingDocId === document.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                  {document.scope === "candidate" &&
                  document.candidateId ? (
                    <DeleteCandidateDocumentButton
                      documentId={document.id}
                      candidateId={document.candidateId}
                    />
                  ) : (
                    <DeleteDocumentButton documentId={document.id} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {previewDocument ? (
        <DocumentPreviewDialog
          document={{
            id: previewDocument.id,
            name: previewDocument.name,
            url: previewDocument.url,
            description: previewDocument.description,
            tags: previewDocument.tags,
            createdAt: previewDocument.createdAt,
            updatedAt: previewDocument.updatedAt,
            slug: "",
            category: "other",
          }}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      ) : null}
    </>
  );
};

export default DocumentContainer;
