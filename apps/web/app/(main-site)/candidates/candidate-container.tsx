"use client";

import React, { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
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
import type { Candidate } from "@workspace/db/schema";
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

type CandidateWithPosition = Candidate & {
  position: { id: string; name: string } | null;
  applicationStatus?: string | null;
};

interface CandidateContainerProps {
  candidates: CandidateWithPosition[];
}

type ViewMode = "grid" | "table";

const CandidateContainer = ({ candidates }: CandidateContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      ) : (
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
                        variant={
                          applicationStatusColors[
                            candidate.applicationStatus
                          ] || "outline"
                        }
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
      )}
    </div>
  );
};

export default CandidateContainer;
