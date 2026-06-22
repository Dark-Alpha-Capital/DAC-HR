
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Download, Loader2, Eye } from "lucide-react";
import DeleteDocumentButton from "~/components/delete-document-button";
import DocumentPreviewDialog from "~/components/document-preview-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";
import type { Document, DocumentCategory } from "@workspace/db/schema";

interface DocumentWithCategories extends Document {
  categories?: DocumentCategory[];
}

interface DocumentContainerProps {
  documents: DocumentWithCategories[];
}

const DocumentContainer = ({ documents }: DocumentContainerProps) => {
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownloadDocument = async (document: Document) => {
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
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
          {documents.map((document, index) => {
            const categories = document.categories || [];
            return (
              <TableRow key={document.id}>
                <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="py-1.5 px-2 font-medium text-sm">
                  {document.name}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-sm">
                  {categories.length > 0 ? (
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
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
                    <DeleteDocumentButton documentId={document.id} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}
    </>
  );
};

export default DocumentContainer;
