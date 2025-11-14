"use client";

import { ColumnDef } from "@tanstack/react-table";
import { applicationStatusEnum } from "@workspace/db/schema";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

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

import { Checkbox } from "@workspace/ui/components/checkbox";
import { deleteCandidate } from "@/lib/actions/delete-candidate";

export type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  positionName: string;
  positionId: string;
};

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
      const candidate = row.original;
      const router = useRouter();
      const pathname = usePathname();
      const [open, setOpen] = useState(false);

      // Close dropdown when route changes
      useEffect(() => {
        setOpen(false);
      }, [pathname]);

      // Cleanup: ensure dropdown closes on unmount
      useEffect(() => {
        return () => {
          setOpen(false);
        };
      }, []);

      return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                // Close dropdown immediately
                setOpen(false);
                // Force navigation after ensuring state update
                setTimeout(() => {
                  router.push(`/candidates/${candidate.id}`);
                }, 150);
              }}
            >
              View candidate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={"destructive"}
              onSelect={async () => {
                const response = await deleteCandidate(candidate.id);
                if (response?.error) {
                  toast.error(response.error);
                }
                if (response?.success) {
                  toast.success("Candidate deleted successfully");
                }
              }}
            >
              Delete candidate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
