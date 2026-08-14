import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Loader2, FileText, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { resolveDocumentAccessUrl } from "#/lib/documents/access";

interface DocumentPreviewDialogProps {
  document: {
    name: string;
    url: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FileType = "pdf" | "docx" | "txt" | "unknown";

// Helper function to detect file type from URL
function getFileType(url: string): FileType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".pdf")) return "pdf";
  if (lowerUrl.endsWith(".docx")) return "docx";
  if (lowerUrl.endsWith(".doc")) return "docx"; // Treat .doc as docx
  if (lowerUrl.endsWith(".txt")) return "txt";
  if (lowerUrl.endsWith(".text")) return "txt";

  // Try to detect from content type or URL pattern
  if (lowerUrl.includes(".pdf") || lowerUrl.includes("pdf")) return "pdf";
  if (lowerUrl.includes(".docx") || lowerUrl.includes("docx")) return "docx";
  if (lowerUrl.includes(".txt") || lowerUrl.includes("text")) return "txt";

  return "unknown";
}

// Helper function to get signed URL
const getSignedUrl = resolveDocumentAccessUrl;

export default function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRequestIdRef = useRef(0);
  const fileType = getFileType(document.url);

  const loadPreview = useCallback(
    async (requestId: number, signal: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      setPreviewUrl(null);
      setTextContent(null);

      try {
        const signedUrl = await getSignedUrl(document.url, signal);
        if (signal.aborted || previewRequestIdRef.current !== requestId) {
          return;
        }

        if (fileType === "txt") {
          // Fetch and display text content
          const response = await fetch(signedUrl, { signal });
          if (!response.ok) {
            throw new Error("Failed to fetch document");
          }
          const text = await response.text();
          if (signal.aborted || previewRequestIdRef.current !== requestId) {
            return;
          }
          setTextContent(text);
        } else if (fileType === "pdf") {
          // Set URL for PDF iframe
          setPreviewUrl(signedUrl);
        } else if (fileType === "docx") {
          // DOCX preview - we'll show a message and offer download
          setPreviewUrl(signedUrl);
        } else {
          setError("Unsupported file type for preview");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        if (signal.aborted || previewRequestIdRef.current !== requestId) {
          return;
        }

        console.error("Error loading preview:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load document preview",
        );
        toast.error("Failed to load document preview");
      } finally {
        if (!signal.aborted && previewRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [document.url, fileType],
  );

  useEffect(() => {
    if (!open || !document.url) {
      previewRequestIdRef.current += 1;
      setPreviewUrl(null);
      setTextContent(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    const controller = new AbortController();

    void loadPreview(requestId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [document.url, loadPreview, open]);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      const signedUrl = await getSignedUrl(document.url);
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = document.name || "document";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(blobUrl);
      window.document.body.removeChild(anchor);
      toast.success("Document downloaded");
    } catch (err) {
      console.error("Error downloading document:", err);
      toast.error("Failed to download document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.name}
          </DialogTitle>
          <DialogDescription>
            Preview of {document.name}
            {fileType !== "unknown" && (
              <span className="ml-2 text-xs">({fileType.toUpperCase()})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading preview...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleDownload} variant="secondary" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Instead
                </Button>
              </div>
            </div>
          ) : fileType === "txt" && textContent !== null ? (
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {textContent}
                </pre>
              </div>
            </ScrollArea>
          ) : fileType === "pdf" && previewUrl ? (
            <div className="flex-1 border rounded-md overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[500px]"
                title={`Preview of ${document.name}`}
              />
            </div>
          ) : fileType === "docx" && previewUrl ? (
            <div className="flex-1 flex flex-col border rounded-md overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">DOCX Preview</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    DOCX files can be viewed using Microsoft Office Online
                    viewer. You can also download the file to view it locally.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={() => {
                        // Use Office Online viewer
                        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
                        window.open(
                          officeViewerUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      variant="default"
                    >
                      View in Office Online
                    </Button>
                    <Button onClick={handleDownload} variant="secondary">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : fileType === "unknown" ? (
            <div className="flex-1 flex items-center justify-center border rounded-md">
              <div className="text-center max-w-md p-8">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Unknown File Type
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Unable to determine file type. You can download the file to
                  view it.
                </p>
                <Button onClick={handleDownload} variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleDownload} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="default"
            size="sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
