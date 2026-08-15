import { Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import type { MeetParticipantKind } from "#/features/attendance/meet-attendance";
import type { StoredAttendanceRow } from "#/features/attendance/types";
import { formatDateTime, formatMMDD } from "#/lib/utils";

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
      <span className="font-mono text-xs">
        {formatMMDD(row.original.attendanceDate)}
      </span>
    ),
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
        {formatDateTime(row.original.joinedAt)}
      </span>
    ),
  },
  {
    accessorKey: "leftAt",
    header: "Left",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.leftAt ? formatDateTime(row.original.leftAt) : "—"}
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

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
