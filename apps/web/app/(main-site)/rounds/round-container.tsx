"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
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

type ViewMode = "grid" | "table" | "kanban";

const RoundContainer = ({ rounds }: RoundContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Group rounds by position for kanban view
  const roundsByPosition = useMemo(() => {
    const grouped = new Map<string, Round[]>();
    const unassigned: Round[] = [];

    rounds.forEach((round) => {
      if (round.positions.length === 0) {
        unassigned.push(round);
      } else {
        round.positions.forEach((position) => {
          if (!grouped.has(position.id)) {
            grouped.set(position.id, []);
          }
          // Only add if not already added (avoid duplicates)
          const existing = grouped.get(position.id)!;
          if (!existing.find((r) => r.id === round.id)) {
            existing.push(round);
          }
        });
      }
    });

    const result = Array.from(grouped.entries()).map(([id, rounds]) => ({
      id,
      name: rounds[0]?.positions.find((p) => p.id === id)?.name || "Unknown",
      rounds,
    }));

    if (unassigned.length > 0) {
      result.push({
        id: "unassigned",
        name: "Unassigned",
        rounds: unassigned,
      });
    }

    return result;
  }, [rounds]);

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
          {rounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      ) : viewMode === "table" ? (
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
                        <Badge key={position.id} variant="secondary" className="text-xs">
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
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {roundsByPosition.map((position) => (
              <div key={position.id} className="shrink-0 w-72 flex flex-col">
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {position.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {position.rounds.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {position.rounds.map((round) => (
                    <Card
                      key={round.id}
                      className="hover:shadow-sm transition-shadow py-2 px-2"
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1.5">
                          <div>
                            <h4 className="font-medium leading-tight text-sm">
                              {round.name}
                            </h4>
                            {round.description && (
                              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                                {round.description}
                              </p>
                            )}
                          </div>
                          {round.positions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {round.positions
                                .filter((p) => p.id !== position.id)
                                .slice(0, 2)
                                .map((pos) => (
                                  <Badge
                                    key={pos.id}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {pos.name}
                                  </Badge>
                                ))}
                              {round.positions.filter((p) => p.id !== position.id)
                                .length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{round.positions.filter((p) => p.id !== position.id).length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground leading-tight">
                            {formatDate(round.createdAt)}
                          </div>
                          <div className="flex items-center gap-1 pt-1.5 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/rounds/${round.id}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/rounds/${round.id}/edit`}>
                                <Pencil className="h-3 w-3" />
                              </Link>
                            </Button>
                            <div className="ml-auto">
                              <DeleteRoundButton roundId={round.id} />
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

export default RoundContainer;

