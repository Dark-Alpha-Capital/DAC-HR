import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";
import DeleteCandidateButton from "~/components/delete-candidate-button";
import BulkDeleteCandidatesButton from "~/components/bulk-delete-candidates-button";
import { Badge } from "~/components/ui/badge";
import type { Candidate } from "@workspace/db/schema";
const applicationStatusColors: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  ai_screening: "secondary",
  first_round_recruiter_call: "default",
  second_round_technical_screening: "default",
  third_round_final_ceo: "default",
  contract_offer: "default",
  onboarding: "default",
  rejected: "destructive",
  withdrawn: "secondary",
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allCandidateIds = useMemo(
    () => candidates.map((c) => c.id),
    [candidates],
  );

  const isAllSelected = useMemo(
    () => candidates.length > 0 && selectedIds.size === candidates.length,
    [candidates.length, selectedIds.size],
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(allCandidateIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectCandidate = (candidateId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(candidateId);
    } else {
      newSelected.delete(candidateId);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteComplete = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} candidate{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
          </div>
          <BulkDeleteCandidatesButton
            selectedIds={Array.from(selectedIds)}
            onDeleteComplete={handleDeleteComplete}
          />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 px-2 text-xs w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all candidates"
              />
            </TableHead>
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
            const isSelected = selectedIds.has(candidate.id);
            return (
              <TableRow
                key={candidate.id}
                className={isSelected ? "bg-muted/50" : ""}
              >
                <TableCell className="py-1.5 px-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleSelectCandidate(candidate.id, checked === true)
                    }
                    aria-label={`Select ${fullName}`}
                  />
                </TableCell>
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
                        applicationStatusColors[candidate.applicationStatus] ||
                        "secondary"
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
                      variant="secondary"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link to="/candidates/$uid" search={{} as any} params={{ uid: candidate.id }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link
                        to="/candidates/$uid/edit"
                        params={{ uid: candidate.id }}
                      >
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
    </div>
  );
};

export default CandidateContainer;
