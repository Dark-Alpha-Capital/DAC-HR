"use client";

import React, { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import PositionCard from "@/components/position-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import DeletePositionButton from "@/components/delete-position-button";
import { Badge } from "@workspace/ui/components/badge";

const hireLevelLabels: Record<string, string> = {
  "managing-director": "Managing Director",
  "vice-president": "Vice President",
  "associate-analyst": "Associate Analyst",
  "intern": "Intern",
};

interface Position {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hireLevel?: string | null;
}

interface PositionContainerProps {
  positions: Position[];
}

type ViewMode = "grid" | "table";

const PositionContainer = ({ positions }: PositionContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="space-y-4">
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
      </ToggleGroup>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => (
            <PositionCard
              key={position.id}
              positionId={position.id}
              positionName={position.name}
              positionDescription={position.description || ""}
              positionSlug={position.slug}
              hireLevel={position.hireLevel}
            />
          ))}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
                <TableHead className="py-1.5 px-2 text-xs">Hire Level</TableHead>
                <TableHead className="py-1.5 px-2 text-xs">Slug</TableHead>
                <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
                <TableHead className="text-right py-1.5 px-2 text-xs">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="py-1.5 px-2 font-medium text-sm">
                    {position.name}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {position.hireLevel ? (
                      <Badge variant="secondary" className="text-xs">
                        {hireLevelLabels[position.hireLevel] || position.hireLevel}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {position.slug}
                    </code>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-muted-foreground">
                    {/* Created date can be wired here when available */}—
                  </TableCell>
                  <TableCell className="text-right py-1.5 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/positions/${position.slug}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/positions/${position.slug}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeletePositionButton positionId={position.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PositionContainer;
