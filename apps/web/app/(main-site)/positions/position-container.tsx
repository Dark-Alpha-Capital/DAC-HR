"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
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
import { Card, CardContent } from "@workspace/ui/components/card";

interface Position {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface PositionContainerProps {
  positions: Position[];
}

type ViewMode = "grid" | "table" | "kanban";

const PositionContainer = ({ positions }: PositionContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Group positions alphabetically by first letter for kanban view
  const positionsByLetter = useMemo(() => {
    const grouped = new Map<string, Position[]>();

    positions.forEach((position) => {
      const firstLetter = position.name.charAt(0).toUpperCase();
      const letterKey = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      if (!grouped.has(letterKey)) {
        grouped.set(letterKey, []);
      }
      grouped.get(letterKey)!.push(position);
    });

    // Sort by letter
    return Array.from(grouped.entries())
      .sort(([a], [b]) => {
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
      })
      .map(([letter, positions]) => ({
        letter,
        positions: positions.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [positions]);

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
          {positions.map((position) => (
            <PositionCard
              key={position.id}
              positionId={position.id}
              positionName={position.name}
              positionDescription={position.description || ""}
              positionSlug={position.slug}
            />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Description</TableHead>
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
                  {position.description || "-"}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-sm">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {position.slug}
                  </code>
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
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {positionsByLetter.map((group) => (
              <div key={group.letter} className="shrink-0 w-72 flex flex-col">
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {group.letter}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {group.positions.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {group.positions.map((position) => (
                    <Card
                      key={position.id}
                      className="hover:shadow-sm transition-shadow py-2 px-2"
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1.5">
                          <div>
                            <h4 className="font-medium leading-tight text-sm">
                              {position.name}
                            </h4>
                            {position.description && (
                              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                                {position.description}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground leading-tight">
                            <code className="bg-muted px-1.5 py-0.5 rounded">
                              {position.slug}
                            </code>
                          </div>
                          <div className="flex items-center gap-1 pt-1.5 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/positions/${position.slug}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/positions/${position.slug}/edit`}>
                                <Pencil className="h-3 w-3" />
                              </Link>
                            </Button>
                            <div className="ml-auto">
                              <DeletePositionButton positionId={position.id} />
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
    </div>
  );
};

export default PositionContainer;
