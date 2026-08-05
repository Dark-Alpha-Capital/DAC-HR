import { Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { MeetParticipantKind } from "~/lib/attendance/meet-attendance";
import type { StoredAttendanceRow } from "@workspace/db/repositories/meet-attendance-repository";

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(ms: number | null) {
  if (ms === null || Number.isNaN(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function kindLabel(kind: MeetParticipantKind) {
  switch (kind) {
    case "signedin":
      return "Signed in";
    case "anonymous":
      return "Guest";
    case "phone":
      return "Phone";
    case "unknown":
      return "Unknown";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const columns: ColumnDef<StoredAttendanceRow>[] = [
  {
    accessorKey: "attendanceDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.attendanceDate}</span>
    ),
    filterFn: (row, _id, value: string) => {
      if (!value) return true;
      return row.original.attendanceDate === value;
    },
  },
  {
    accessorKey: "displayName",
    header: "Attendee",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {kindLabel(row.original.kind)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "meetingTitle",
    header: "Meeting",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          to="/employees/attendance/$conferenceId"
          params={{ conferenceId: row.original.conferenceId }}
          className="truncate font-medium text-foreground no-underline hover:underline"
        >
          {row.original.meetingTitle}
        </Link>
        {row.original.meetingCode ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {row.original.meetingCode}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatTime(row.original.joinedAt)}
      </span>
    ),
  },
  {
    accessorKey: "leftAt",
    header: "Left",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.leftAt ? formatTime(row.original.leftAt) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "durationMs",
    header: "Duration",
    cell: ({ row }) => (
      <span className="text-xs font-medium">
        {formatDuration(row.original.durationMs)}
      </span>
    ),
  },
];

export function AttendanceDataTable({ data }: { data: StoredAttendanceRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "attendanceDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const dateFilter =
    (table.getColumn("attendanceDate")?.getFilterValue() as
      | string
      | undefined) ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="attendance-date-filter"
            className="text-xs text-muted-foreground"
          >
            Filter by date
          </Label>
          <Input
            id="attendance-date-filter"
            type="date"
            className="w-auto bg-background"
            value={dateFilter}
            onChange={(event) => {
              const next = event.target.value;
              table
                .getColumn("attendanceDate")
                ?.setFilterValue(next || undefined);
            }}
          />
        </div>
        {dateFilter ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              table.getColumn("attendanceDate")?.setFilterValue(undefined)
            }
          >
            Show all dates
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {table.getFilteredRowModel().rows.length} attendee
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No stored attendance yet. Open a meeting from Meetings to sync
                  who joined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
