"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
import CandidateCard from "@/components/candidate-card";
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
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import type { InferSelectModel } from "drizzle-orm";
import type { candidate } from "@workspace/db/schema";

const applicationStatusColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  reviewed: "secondary",
  shortlisted: "default",
  interviewing: "default",
  hired: "default",
  rejected: "destructive",
  withdrawn: "outline",
} as const;

type Candidate = InferSelectModel<typeof candidate> & {
  position: { id: string; name: string } | null;
  applicationStatus?: string | null;
};

interface CandidateContainerProps {
  candidates: Candidate[];
}

type ViewMode = "grid" | "table" | "kanban";

const CandidateContainer = ({ candidates }: CandidateContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  // Group candidates by position for kanban view
  const candidatesByPosition = useMemo(() => {
    const grouped = new Map<string, Candidate[]>();

    candidates.forEach((candidate) => {
      const positionKey = candidate.position?.id || "unassigned";
      const positionName = candidate.position?.name || "Unassigned";

      if (!grouped.has(positionKey)) {
        grouped.set(positionKey, []);
      }
      grouped.get(positionKey)!.push(candidate);
    });

    return Array.from(grouped.entries()).map(([id, candidates]) => ({
      id,
      name: candidates[0]?.position?.name || "Unassigned",
      candidates,
    }));
  }, [candidates]);

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
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Email</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Phone</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Location</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Status</TableHead>
              <TableHead className="text-right py-1.5 px-2 text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => {
              const fullName = `${candidate.firstName} ${candidate.lastName}`;
              return (
                <TableRow key={candidate.id}>
                  <TableCell className="py-1.5 px-2 font-medium text-sm">
                    {fullName}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.email}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.phone || "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.location || "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.position?.name || "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.applicationStatus ? (
                      <Badge
                        variant={applicationStatusColors[candidate.applicationStatus] || "outline"}
                        className="text-xs"
                      >
                        {candidate.applicationStatus.charAt(0).toUpperCase() +
                          candidate.applicationStatus.slice(1)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1.5 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/candidates/${candidate.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/candidates/${candidate.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteCandidateButton candidateId={candidate.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-3 md:gap-4 min-w-max pr-4">
            {candidatesByPosition.map((position) => (
              <div key={position.id} className="shrink-0 w-64 sm:w-72 md:w-80 flex flex-col">
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {position.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {position.candidates.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {position.candidates.map((candidate) => {
                    const fullName = `${candidate.firstName} ${candidate.lastName}`;
                    return (
                      <Card
                        key={candidate.id}
                        className="hover:shadow-sm transition-shadow py-2 px-2"
                      >
                        <CardContent className="p-2">
                          <div className="space-y-1.5">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium leading-tight">
                                  {fullName}
                                </h4>
                                {candidate.applicationStatus && (
                                  <Badge
                                    variant={applicationStatusColors[candidate.applicationStatus] || "outline"}
                                    className="shrink-0 text-xs"
                                  >
                                    {candidate.applicationStatus.charAt(0).toUpperCase() +
                                      candidate.applicationStatus.slice(1)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-tight">
                                {candidate.email}
                              </p>
                            </div>
                            {(candidate.phone || candidate.location) && (
                              <div className="text-xs text-muted-foreground leading-tight">
                                {candidate.phone && candidate.location ? (
                                  <p>
                                    {candidate.phone} • {candidate.location}
                                  </p>
                                ) : (
                                  <>
                                    {candidate.phone && (
                                      <p>{candidate.phone}</p>
                                    )}
                                    {candidate.location && (
                                      <p>{candidate.location}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 pt-1.5 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <Link href={`/candidates/${candidate.id}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <Link href={`/candidates/${candidate.id}/edit`}>
                                  <Pencil className="h-3 w-3" />
                                </Link>
                              </Button>
                              <div className="ml-auto">
                                <DeleteCandidateButton
                                  candidateId={candidate.id}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateContainer;
