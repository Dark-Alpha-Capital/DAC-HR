"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Activity,
} from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import GenerateReportDialog from "@/components/generate-report-dialog";

export type AuditLog = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  logs: AuditLog[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function FilterSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.delete("page"); // Reset to page 1 when filtering
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
        }
        router.push(`?${params.toString()}`, {
          scroll: false,
        });
      });
    }, 300);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative flex-1 max-w-sm"
      data-pending={isPending ? "" : undefined}
    >
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search actions, types, IDs..."
        defaultValue={searchParams.get("search") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

function FilterAction() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleFilter = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("page"); // Reset to page 1 when filtering
      if (value && value !== "all") {
        params.set("action", value);
      } else {
        params.delete("action");
      }
      router.push(`?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  return (
    <Select
      defaultValue={searchParams.get("action") || "all"}
      onValueChange={handleFilter}
      disabled={isPending}
    >
      <SelectTrigger className="w-[180px]">
        <Filter className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Filter by action" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Actions</SelectItem>
        <SelectItem value="create">Create</SelectItem>
        <SelectItem value="update">Update</SelectItem>
        <SelectItem value="delete">Delete</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FilterEntityType() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleFilter = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("page"); // Reset to page 1 when filtering
      if (value && value !== "all") {
        params.set("entityType", value);
      } else {
        params.delete("entityType");
      }
      router.push(`?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  return (
    <Select
      defaultValue={searchParams.get("entityType") || "all"}
      onValueChange={handleFilter}
      disabled={isPending}
    >
      <SelectTrigger className="w-[180px]">
        <Filter className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Filter by entity type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Entity Types</SelectItem>
        <SelectItem value="candidate">Candidate</SelectItem>
        <SelectItem value="position">Position</SelectItem>
        <SelectItem value="application">Application</SelectItem>
        <SelectItem value="document">Document</SelectItem>
        <SelectItem value="employee">Employee</SelectItem>
        <SelectItem value="user">User</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ClearFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters =
    searchParams.get("search") ||
    searchParams.get("action") ||
    searchParams.get("entityType") ||
    searchParams.get("userId");

  if (!hasFilters) return null;

  const handleClear = () => {
    router.push("?page=1", { scroll: false });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClear}
      className="h-8 px-2 lg:px-3"
    >
      <X className="h-4 w-4 mr-1" />
      Clear
    </Button>
  );
}

function AuditLogsPaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);

    // Remove page param if going to page 1
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages || 1}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={!hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function getActionBadgeVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  if (action.toLowerCase().includes("create")) {
    return "default";
  }
  if (action.toLowerCase().includes("update")) {
    return "secondary";
  }
  if (action.toLowerCase().includes("delete")) {
    return "destructive";
  }
  return "outline";
}

export function AuditLogsClient({
  logs: initialLogs,
  total,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: Props) {
  const [logs] = React.useState<AuditLog[]>(initialLogs);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <FilterSearch />
            <FilterAction />
            <FilterEntityType />
            <ClearFilters />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {total.toLocaleString()} total log{total !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <GenerateReportDialog />
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found. Try adjusting your filters.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(new Date(log.createdAt))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.userName || "Unknown User"}
                          </span>
                          {log.userEmail && (
                            <span className="text-xs text-muted-foreground">
                              {log.userEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.entityType}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.entityId.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-muted-foreground hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded max-w-md overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No details
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <AuditLogsPaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
