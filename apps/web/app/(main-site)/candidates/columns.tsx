"use client";

import { ColumnDef } from "@tanstack/react-table";
import { applicationStatusEnum } from "@workspace/db/schema";

import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { useRouter } from "next/navigation";
import { deleteCandidate } from "@/lib/actions/delete-candidate";

export type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  positionName: string;
  positionId: string;
};

function CandidateActions({ candidate }: { candidate: Candidate }) {
  const router = useRouter();

  const handleDelete = async () => {
    const response = await deleteCandidate(candidate.id);

    if (response?.error) {
      toast.error(
        typeof response.error === "string"
          ? response.error
          : "Failed to delete candidate",
        {
          position: "bottom-right",
        }
      );
    }

    if (response?.success) {
      toast.success("Candidate deleted successfully", {
        position: "bottom-right",
      });
      // Refresh to show updated data (cache is already invalidated by updateTag)
      router.refresh();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>

        <DropdownMenuItem
          onSelect={() => {
            router.push(`/candidates/${candidate.id}`);
          }}
        >
          View candidate
        </DropdownMenuItem>
        <DropdownMenuItem variant={"destructive"} onSelect={handleDelete}>
          Delete candidate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<Candidate>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },

  {
    accessorKey: "firstName",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "positionName",
    header: "Position",
  },

  {
    id: "actions",
    cell: ({ row }) => {
      return <CandidateActions candidate={row.original} />;
    },
  },
];
