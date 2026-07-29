import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Building2,
  Calendar,
  PartyPopper,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@workspace/db/enums";
import { attendanceStatuses } from "@workspace/db/enums";
import { loadAttendancePage } from "~/lib/loaders/attendance";
import { toOptionalString } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import type { PrismicMember } from "~/lib/prismic/member";

const UNSET_STATUS = "__unset__";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; rowColor: string }
> = {
  present: {
    label: "Present",
    color:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    rowColor: "bg-green-50/50 dark:bg-green-950/20",
  },
  absent: {
    label: "Absent",
    color:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    rowColor: "bg-red-50/50 dark:bg-red-950/20",
  },
  half_day: {
    label: "Half Day",
    color:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    rowColor: "bg-yellow-50/50 dark:bg-yellow-950/20",
  },
  leave: {
    label: "Leave",
    color:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    rowColor: "bg-blue-50/50 dark:bg-blue-950/20",
  },
  holiday: {
    label: "Holiday",
    color:
      "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    rowColor: "bg-purple-50/50 dark:bg-purple-950/20",
  },
};

type RecordForm = {
  status: AttendanceStatus | null;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
};

type AttendancePageData = Awaited<ReturnType<typeof loadAttendancePage>>;

type AttendanceSearch = {
  date: string;
  name?: string;
  designation: string;
};

function parseAttendanceSearch(search: Record<string, unknown>): AttendanceSearch {
  const date =
    typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
      ? search.date
      : todayString();
  const designation =
    typeof search.designation === "string" && search.designation.length > 0
      ? search.designation
      : "all";

  return {
    date,
    name: toOptionalString(search.name),
    designation,
  };
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function getMemberInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildRecordsFromData(data: AttendancePageData): Map<string, RecordForm> {
  const defaultStatus: AttendanceStatus | null = data.holiday ? "holiday" : null;
  const map = new Map<string, RecordForm>();

  for (const member of data.members) {
    if (!member.uid) continue;
    const existing = data.attendance[member.uid];
    map.set(member.uid, {
      status: (existing?.status as AttendanceStatus) ?? defaultStatus,
      checkInTime: existing?.checkInTime ?? "",
      checkOutTime: existing?.checkOutTime ?? "",
      notes: existing?.notes ?? "",
    });
  }

  return map;
}

function attendancePageQueryOptions(date: string) {
  return queryOptions({
    queryKey: queryKeys.attendance.page(date),
    queryFn: async (): Promise<AttendancePageData> =>
      loadAttendancePage({ data: { date } }),
  });
}

export const Route = createFileRoute("/_main/employees/attendance/")({
  head: () => ({
    meta: [{ title: "Attendance" }],
  }),
  validateSearch: parseAttendanceSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const { date } = parseAttendanceSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(attendancePageQueryOptions(date));
  },
  component: AttendancePage,
});

function AttendancePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { date } = search;

  const { data, isLoading, isFetching }: UseQueryResult<AttendancePageData> =
    useQuery(attendancePageQueryOptions(date));

  const navigateDate = useCallback(
    (direction: -1 | 1) => {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() + direction);
      navigate({
        search: (current) => ({
          ...current,
          date: d.toISOString().slice(0, 10),
          name: undefined,
          designation: "all",
        }),
        replace: true,
      });
    },
    [date, navigate],
  );

  const setDate = useCallback(
    (nextDate: string) => {
      navigate({
        search: (current) => ({
          ...current,
          date: nextDate,
          name: undefined,
          designation: "all",
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const dataReady = data?.date === date;

  if (isLoading && !dataReady) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <Button asChild variant="secondary" size="sm">
          <Link to="/employees" search={{ memberType: "all", name: undefined }}>
            <Building2 className="size-4 mr-2" />
            Employees
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateDate(-1)}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Input
          type="date"
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
              setDate(v);
            }
          }}
          className="w-40"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateDate(1)}
          disabled={date >= todayString()}
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={() => setDate(todayString())}>
          Today
        </Button>

        {isFetching && !dataReady ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {dataReady && data ? (
        <AttendanceEditor
          key={date}
          date={date}
          data={data}
          search={search}
          navigate={navigate}
          isFetching={isFetching}
        />
      ) : (
        <ListPageSkeleton />
      )}
    </div>
  );
}

type AttendanceEditorProps = {
  date: string;
  data: AttendancePageData;
  search: AttendanceSearch;
  navigate: ReturnType<typeof Route.useNavigate>;
  isFetching: boolean;
};

function AttendanceEditor({
  date,
  data,
  search,
  navigate,
  isFetching,
}: AttendanceEditorProps) {
  const queryClient = useQueryClient();
  const [records, setRecords] = useState(() => buildRecordsFromData(data));
  const [, startTransition] = useTransition();
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date,
        records: Array.from(records.entries())
          .filter(([, r]) => r.status !== null)
          .map(([prismicUid, r]) => ({
            prismicUid,
            status: r.status as AttendanceStatus,
            checkInTime: r.checkInTime || null,
            checkOutTime: r.checkOutTime || null,
            notes: r.notes || null,
          })),
      };

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to save attendance");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Attendance saved successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.page(date),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Failed to save attendance");
    },
  });

  const holidayMutation = useMutation({
    mutationFn: async (action: "create" | "delete") => {
      let response: Response;
      if (action === "delete" && data.holiday) {
        response = await fetch("/api/holidays", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.holiday.id }),
        });
      } else {
        response = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            name: "Holiday",
            description: null,
          }),
        });
      }

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.page(date),
      });
      toast.success(data.holiday ? "Holiday removed" : "Marked as holiday");
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Failed");
    },
  });

  const setRecordField = useCallback(
    (uid: string, field: keyof RecordForm, value: string | null) => {
      setRecords((prev) => {
        const next = new Map(prev);
        const existing = next.get(uid) ?? {
          status: null,
          checkInTime: "",
          checkOutTime: "",
          notes: "",
        };
        next.set(uid, {
          ...existing,
          [field]:
            field === "status"
              ? (value as AttendanceStatus | null)
              : (value ?? ""),
        });
        return next;
      });
    },
    [],
  );

  const markAll = useCallback((status: AttendanceStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      for (const [uid, r] of next) {
        next.set(uid, { ...r, status });
      }
      return next;
    });
    toast.success(`All marked as ${STATUS_CONFIG[status].label}`);
  }, []);

  const setDesignation = useCallback(
    (designation: string) => {
      navigate({
        search: (current) => ({ ...current, designation }),
        replace: true,
      });
    },
    [navigate],
  );

  const setNameSearch = useCallback(
    (name: string) => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
      nameDebounceRef.current = setTimeout(() => {
        startTransition(() => {
          navigate({
            search: (current) => ({
              ...current,
              name: name.trim() || undefined,
            }),
            replace: true,
          });
        });
      }, 300);
    },
    [navigate],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { unset: 0 };
    for (const [, r] of records) {
      if (r.status === null) {
        counts.unset = (counts.unset ?? 0) + 1;
      } else {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
      }
    }
    return counts;
  }, [records]);

  const designations = useMemo(() => {
    const set = new Set<string>();
    for (const m of data.members) {
      if (m.title) set.add(m.title);
    }
    return Array.from(set).sort();
  }, [data.members]);

  const membersWithUid = data.members.filter(
    (m): m is PrismicMember & { uid: string } => m.uid !== null,
  );

  const filteredMembers = membersWithUid.filter((member) => {
    if (search.name?.trim()) {
      const q = search.name.toLowerCase();
      if (!member.name.toLowerCase().includes(q)) return false;
    }
    if (search.designation !== "all") {
      if (member.title !== search.designation) return false;
    }
    return true;
  });

  const hasChanges = Array.from(records.entries()).some(([uid, r]) => {
    const existing = data.attendance[uid];
    if (existing) {
      return (
        r.status !== existing.status ||
        r.checkInTime !== (existing.checkInTime ?? "") ||
        r.checkOutTime !== (existing.checkOutTime ?? "") ||
        r.notes !== (existing.notes ?? "")
      );
    }
    return r.status !== null;
  });

  const isHoliday = Boolean(data.holiday);

  return (
    <>
      {isHoliday ? (
        <div className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/30">
          <div className="flex items-center gap-2">
            <PartyPopper className="size-5 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-purple-800 dark:text-purple-300">
              Holiday — {data.holiday?.name}
            </span>
            {data.holiday?.description ? (
              <span className="text-sm text-purple-600 dark:text-purple-400">
                {data.holiday.description}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-purple-600 hover:text-purple-800 dark:text-purple-400"
              onClick={() => holidayMutation.mutate("delete")}
              disabled={holidayMutation.isPending}
            >
              Remove Holiday
            </Button>
          </div>
        </div>
      ) : data.isMarked ? (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <Check className="size-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-800 dark:text-green-300">
              Attendance marked
            </span>
            {data.markedBy ? (
              <span className="text-sm text-green-600 dark:text-green-400">
                by {data.markedBy}
              </span>
            ) : null}
            {data.markedAt ? (
              <span className="text-sm text-green-600 dark:text-green-400">
                on {new Date(data.markedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Attendance not yet marked for {formatDate(date)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-amber-600 hover:text-amber-800 dark:text-amber-400"
              onClick={() => holidayMutation.mutate("create")}
              disabled={holidayMutation.isPending}
            >
              <PartyPopper className="size-4 mr-1" />
              Mark as Holiday
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={search.designation} onValueChange={setDesignation}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Filter designation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              {designations.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            key={`name-${search.name ?? ""}`}
            type="text"
            placeholder="Search name..."
            defaultValue={search.name ?? ""}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-48 h-8 text-sm"
          />

          <Button variant="secondary" size="sm" onClick={() => markAll("present")}>
            <Check className="size-4 mr-1" />
            All Present
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!hasChanges && data.isMarked)}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <Check className="size-4 mr-1" />
            )}
            {data.isMarked ? "Update Attendance" : "Save Attendance"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-normal text-muted-foreground">
          Total: {filteredMembers.length}
        </Badge>
        {(statusCounts.unset ?? 0) > 0 ? (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Not Set: {statusCounts.unset}
          </Badge>
        ) : null}
        {attendanceStatuses.map((status) => {
          const count = statusCounts[status];
          if (!count) return null;
          const cfg = STATUS_CONFIG[status];
          return (
            <Badge key={status} className={cfg.color}>
              {cfg.label}: {count}
            </Badge>
          );
        })}
      </div>

      <Card
        className="transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[100px]">In Time</TableHead>
                <TableHead className="w-[100px]">Out Time</TableHead>
                <TableHead className="w-[180px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <p className="text-muted-foreground">
                      {membersWithUid.length === 0
                        ? "No employees found in Prismic."
                        : "No employees match the current filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member, index) => {
                  const record = records.get(member.uid);
                  const status = record?.status ?? null;
                  const cfg = status ? STATUS_CONFIG[status] : null;

                  return (
                    <TableRow key={member.uid} className={cfg?.rowColor}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 shrink-0">
                            {member.photoUrl ? (
                              <AvatarImage
                                src={member.photoUrl}
                                alt={member.name}
                              />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {getMemberInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.title ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={status ?? UNSET_STATUS}
                          onValueChange={(v) =>
                            setRecordField(
                              member.uid,
                              "status",
                              v === UNSET_STATUS ? null : v,
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="w-full">
                            <SelectValue placeholder="Not set">
                              {cfg ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                                >
                                  {cfg.label}
                                </span>
                              ) : (
                                "Not set"
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNSET_STATUS}>Not set</SelectItem>
                            {attendanceStatuses.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_CONFIG[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record?.checkInTime ?? ""}
                          onChange={(e) =>
                            setRecordField(
                              member.uid,
                              "checkInTime",
                              e.target.value,
                            )
                          }
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record?.checkOutTime ?? ""}
                          onChange={(e) =>
                            setRecordField(
                              member.uid,
                              "checkOutTime",
                              e.target.value,
                            )
                          }
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Add note..."
                          value={record?.notes ?? ""}
                          onChange={(e) =>
                            setRecordField(member.uid, "notes", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredMembers.length > 0 &&
      membersWithUid.length !== filteredMembers.length ? (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredMembers.length} of {membersWithUid.length} employees
        </p>
      ) : null}
    </>
  );
}
