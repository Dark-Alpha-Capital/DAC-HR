"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { deleteQuestion } from "@/lib/actions/delete-question";
import { Badge } from "@workspace/ui/components/badge";

export type Question = {
  id: string;
  questionText: string;
  rounds: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
};

export const columns: ColumnDef<Question>[] = [
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
    accessorKey: "questionText",
    header: ({ column }) => {
      return (
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Question
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const questionText = row.getValue("questionText") as string;
      return (
        <div className="max-w-[500px] truncate font-medium">{questionText}</div>
      );
    },
  },
  {
    accessorKey: "rounds",
    header: "Rounds",
    cell: ({ row }) => {
      const rounds = row.getValue("rounds") as Array<{
        id: string;
        name: string;
      }>;
      if (!rounds || rounds.length === 0) {
        return <span className="text-muted-foreground text-sm">No rounds</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {rounds.map((round) => (
            <Badge key={round.id} variant="secondary">
              {round.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "positions",
    header: "Positions",
    cell: ({ row }) => {
      const positions = row.getValue("positions") as Array<{
        id: string;
        name: string;
      }>;
      if (!positions || positions.length === 0) {
        return (
          <span className="text-muted-foreground text-sm">No positions</span>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {positions.map((position) => (
            <Badge key={position.id} variant="secondary">
              {position.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const router = useRouter();
      const question = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => {
                router.push(`/questions/${question.id}`);
              }}
            >
              View question
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                router.push(`/questions/${question.id}/edit`);
              }}
            >
              Edit question
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant={"destructive"}
              onSelect={async () => {
                const response = await deleteQuestion(question.id);
                if (response?.error) {
                  toast.error(response.error);
                }
                if (response?.success) {
                  toast.success("Question deleted successfully");
                }
              }}
            >
              Delete question
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
