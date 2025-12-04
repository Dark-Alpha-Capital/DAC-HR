"use client";

import React, { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import RoundCard from "@/components/round-card";
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
import DeleteRoundButton from "@/components/delete-round-button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

interface Position {
  id: string;
  name: string;
}

interface Round {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  positions: Position[];
}

interface RoundContainerProps {
  rounds: Round[];
}

type ViewMode = "grid" | "table";

const RoundContainer = ({ rounds }: RoundContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Description</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Positions</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
              <TableHead className="text-right py-1.5 px-2 text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => (
              <TableRow key={round.id}>
                <TableCell className="py-1.5 px-2 font-medium text-sm">
                  {round.name}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-sm">
                  {round.description || "-"}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-sm">
                  {round.positions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {round.positions.map((position) => (
                        <Badge
                          key={position.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {position.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No positions</span>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-sm">
                  {formatDate(round.createdAt)}
                </TableCell>
                <TableCell className="text-right py-1.5 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link href={`/rounds/${round.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link href={`/rounds/${round.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteRoundButton roundId={round.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default RoundContainer;
