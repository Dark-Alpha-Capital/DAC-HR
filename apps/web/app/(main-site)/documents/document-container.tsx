"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
import DocumentCard from "@/components/document-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Eye } from "lucide-react";
import DeleteDocumentButton from "@/components/delete-document-button";
import { Card, CardContent } from "@workspace/ui/components/card";
import DocumentPreviewDialog from "@/components/document-preview-dialog";
import type { Document } from "@workspace/db/schema";

interface DocumentContainerProps {
  documents: Document[];
}

type ViewMode = "grid" | "table" | "kanban";

const categoryLabels = {
  "job-description": "Job Description",
  onboarding: "Onboarding",
  policy: "Policy",
  "hr-form": "HR Form",
  other: "Other",
} as const;

const DocumentContainer = ({ documents }: DocumentContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  // Group documents by category for kanban view
  const documentsByCategory = useMemo(() => {
    const grouped = new Map<string, Document[]>();

    documents.forEach((document) => {
      const categoryKey = document.category || "other";
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, []);
      }
      grouped.get(categoryKey)!.push(document);
    });

    return Array.from(grouped.entries()).map(([category, docs]) => ({
      category,
      name: categoryLabels[category as keyof typeof categoryLabels] || "Other",
      documents: docs,
    }));
  }, [documents]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as ViewMode);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <Columns className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
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
            {documents.map((document) => {
              const categoryLabel =
                categoryLabels[
                  document.category as keyof typeof categoryLabels
                ] || "Other";
              return (
                <TableRow key={document.id}>
                  <TableCell className="py-1.5 px-2 font-medium text-sm">
                    {document.name}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {categoryLabel}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setPreviewDocument(document)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteDocumentButton documentId={document.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {documentsByCategory.map((category) => (
              <div
                key={category.category}
                className="shrink-0 w-72 flex flex-col"
              >
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {category.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {category.documents.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {category.documents.map((document) => (
                    <Card
                      key={document.id}
                      className="hover:shadow-sm transition-shadow py-2 px-2"
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1.5">
                          <div>
                            <h4 className="font-medium leading-tight text-sm">
                              {document.name}
                            </h4>
                            {document.description && (
                              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                                {document.description}
                              </p>
                            )}
                          </div>
                          {document.tags && document.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {document.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="text-xs px-1.5 py-0.5 bg-muted rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {document.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{document.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground leading-tight">
                            {formatDate(document.createdAt)}
                          </div>
                          <div className="flex items-center gap-1 pt-1.5 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setPreviewDocument(document)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <div className="ml-auto">
                              <DeleteDocumentButton documentId={document.id} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}
    </div>
  );
};

export default DocumentContainer;

