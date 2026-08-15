import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Checkbox } from "#/components/ui/checkbox";
import { useNavigate } from "@tanstack/react-router";
import BulkDeleteCandidatesButton from "#/features/candidates/components/bulk-delete-candidates-button";
import type { Candidate } from "@workspace/db/schema";
import type { ApplicationStatus } from "@workspace/db/application-status";
import { ApplicationStatusBadge } from "#/components/shared/application-status-badge";
import CopyButton from "#/features/candidates/components/copy-button";
import { Badge } from "#/components/ui/badge";
import { displayPhone } from "#/components/ui/phone-input";
import { formatDate, isNew } from "#/lib/utils";

type CandidateWithPosition = Candidate & {
  position: { id: string; name: string } | null;
  applicationStatus?: ApplicationStatus;
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
  const navigate = useNavigate();
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

  const handleRowClick = (candidateId: string) => {
    navigate({ to: "/candidates/$uid", params: { uid: candidateId } });
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
            <TableHead className="py-1.5 px-2 text-xs">Status</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Email</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Phone</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Location</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No candidates on this page.
              </TableCell>
            </TableRow>
          ) : (
            candidates.map((candidate) => {
              const fullName = `${candidate.firstName} ${candidate.lastName}`;
              const isSelected = selectedIds.has(candidate.id);
              const location =
                candidate.locationCity && candidate.locationState
                  ? `${candidate.locationCity}, ${candidate.locationState}`
                  : candidate.locationCity ||
                    candidate.locationState ||
                    candidate.location ||
                    "-";
              return (
                <TableRow
                  key={candidate.id}
                  className={`cursor-pointer ${isSelected ? "bg-muted/50" : ""}`}
                  onClick={() => handleRowClick(candidate.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRowClick(candidate.id);
                    }
                  }}
                >
                  <TableCell
                    className="py-1.5 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleSelectCandidate(candidate.id, checked === true)
                      }
                      aria-label={`Select ${fullName}`}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.applicationStatus ? (
                      <ApplicationStatusBadge
                        status={candidate.applicationStatus}
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 font-medium text-sm">
                    <div className="flex items-center gap-2">
                      {isNew(candidate.createdAt) && (
                        <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                          New
                        </Badge>
                      )}
                      {fullName}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm max-w-[200px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="truncate">{candidate.email}</span>
                      <CopyButton value={candidate.email} label="email" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {candidate.position?.name || "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {displayPhone(candidate.phone) || "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {location}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm whitespace-nowrap">
                    {formatDate(candidate.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CandidateContainer;
