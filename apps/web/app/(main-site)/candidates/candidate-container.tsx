"use client";

import React from "react";
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
  currentPage?: number;
  limit?: number;
}

const CandidateContainer = ({
  candidates,
  currentPage = 1,
  limit = 50,
}: CandidateContainerProps) => {
  const startIndex = (currentPage - 1) * limit;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
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
        {candidates.map((candidate, index) => {
          const fullName = `${candidate.firstName} ${candidate.lastName}`;
          return (
            <TableRow key={candidate.id}>
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                {startIndex + index + 1}
              </TableCell>
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
  );
};

export default CandidateContainer;
