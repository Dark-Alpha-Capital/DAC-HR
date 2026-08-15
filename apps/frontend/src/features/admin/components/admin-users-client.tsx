import * as React from "react";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { authClient } from "#/features/auth/client";
import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#/components/ui/tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "#/components/ui/avatar";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "#/features/admin/server/queries/users";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";
import PaginationControls from "#/components/shared/pagination-controls";

export type { AdminUser };

type Props = {
  users: AdminUser[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ActionState = {
  banning: boolean;
  unbanning: boolean;
  revokingSessions: boolean;
  error: string | null;
};

function getUserInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstChar = parts[0]?.[0] || "";
      const lastChar = parts[parts.length - 1]?.[0] || "";
      return (firstChar + lastChar).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function FilterAdminUserName() {
  return (
    <DebouncedTextFilter
      param="name"
      placeholder="Search by name..."
      ariaLabel="Filter admin users by name"
    />
  );
}

function FilterAdminUserEmail() {
  return (
    <DebouncedTextFilter
      param="email"
      type="email"
      placeholder="Search by email..."
      ariaLabel="Filter admin users by email"
      icon={<Mail className="h-4 w-4 text-muted-foreground" />}
    />
  );
}

export function AdminUsersClient({
  users: initialUsers,
  total: _total,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: Props) {
  const invalidate = useQueryInvalidation();
  const [view, setView] = React.useState<"cards" | "table">("cards");
  const [users, setUsers] = React.useState<AdminUser[]>(initialUsers);
  const [userStates, setUserStates] = React.useState<
    Record<string, ActionState>
  >(() =>
    Object.fromEntries(
      initialUsers.map((u) => [
        u.id,
        {
          banning: false,
          unbanning: false,
          revokingSessions: false,
          error: null,
        },
      ]),
    ),
  );

  // Update users when initialUsers changes (e.g., after router refresh)
  React.useEffect(() => {
    setUsers(initialUsers);
    // Initialize state for any new users
    setUserStates((prev) => {
      const newState = { ...prev };
      initialUsers.forEach((u) => {
        if (!newState[u.id]) {
          newState[u.id] = {
            banning: false,
            unbanning: false,
            revokingSessions: false,
            error: null,
          };
        }
      });
      return newState;
    });
  }, [initialUsers]);

  const updateState = (userId: string, patch: Partial<ActionState>) => {
    setUserStates((prev) => ({
      ...prev,
      [userId]: {
        banning: prev[userId]?.banning ?? false,
        unbanning: prev[userId]?.unbanning ?? false,
        revokingSessions: prev[userId]?.revokingSessions ?? false,
        error: prev[userId]?.error ?? null,
        ...patch,
      },
    }));
  };

  const handleBan = async (userId: string) => {
    updateState(userId, { banning: true, error: null });

    // Store previous state for potential rollback
    const previousUser = users.find((u) => u.id === userId);
    if (!previousUser) return;

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              banned: true,
              banReason: "Banned by admin from Admin Dashboard",
            }
          : u,
      ),
    );

    try {
      await authClient.admin.banUser({
        userId,
        banReason: "Banned by admin from Admin Dashboard",
      });

      toast.success("User banned successfully", {
        description: "The user has been banned and cannot access the site.",
      });

      // Refresh to get latest data from server
      void invalidate.adminUsers();
    } catch (error) {
      console.error("Error banning user", error);

      // Revert optimistic update
      setUsers((prev) => prev.map((u) => (u.id === userId ? previousUser : u)));

      updateState(userId, { error: "Failed to ban user. Please try again." });
      toast.error("Failed to ban user", {
        description: "Please try again or check your connection.",
      });
    } finally {
      updateState(userId, { banning: false });
    }
  };

  const handleUnban = async (userId: string) => {
    updateState(userId, { unbanning: true, error: null });

    // Store previous state for potential rollback
    const previousUser = users.find((u) => u.id === userId);
    if (!previousUser) return;

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, banned: false, banReason: null, banExpires: null }
          : u,
      ),
    );

    try {
      await authClient.admin.unbanUser({ userId });

      toast.success("User unbanned successfully", {
        description: "The user can now access the site again.",
      });

      // Refresh to get latest data from server
      void invalidate.adminUsers();
    } catch (error) {
      console.error("Error unbanning user", error);

      // Revert optimistic update
      setUsers((prev) => prev.map((u) => (u.id === userId ? previousUser : u)));

      updateState(userId, { error: "Failed to unban user. Please try again." });
      toast.error("Failed to unban user", {
        description: "Please try again or check your connection.",
      });
    } finally {
      updateState(userId, { unbanning: false });
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    updateState(userId, { revokingSessions: true, error: null });

    const user = users.find((u) => u.id === userId);
    const userName = user?.name || user?.email || "User";

    try {
      await authClient.admin.revokeUserSessions({ userId });

      toast.success("Sessions revoked successfully", {
        description: `${userName}'s active sessions have been revoked. They will need to sign in again.`,
      });

      // Refresh to ensure we have latest data
      void invalidate.adminUsers();
    } catch (error) {
      console.error("Error revoking user sessions", error);
      updateState(userId, {
        error: "Failed to revoke sessions. Please try again.",
      });
      toast.error("Failed to revoke sessions", {
        description: "Please try again or check your connection.",
      });
    } finally {
      updateState(userId, { revokingSessions: false });
    }
  };

  const renderStatusBadge = (user: AdminUser) => {
    if (user.banned) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Ban className="h-3 w-3" />
          Banned
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Active
      </Badge>
    );
  };

  const renderActions = (user: AdminUser) => {
    const state = userStates[user.id] || {
      banning: false,
      unbanning: false,
      revokingSessions: false,
      error: null,
    };

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={user.banned ? "secondary" : "destructive"}
            disabled={state.banning || state.unbanning}
            onClick={() =>
              user.banned ? handleUnban(user.id) : handleBan(user.id)
            }
          >
            {state.banning || state.unbanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user.banned ? (
              "Unban"
            ) : (
              <>
                <Ban className="h-4 w-4 mr-1" />
                Ban
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={state.revokingSessions}
            onClick={() => handleRevokeSessions(user.id)}
          >
            {state.revokingSessions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-1" />
                Revoke Sessions
              </>
            )}
          </Button>
        </div>

        {state.error && (
          <div className="flex items-start gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Users & Access Control
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View all non-admin users, manage bans, and revoke active sessions.
          </p>
        </div>

        <Tabs
          value={view}
          onValueChange={(value) =>
            // SAFETY: the only TabsTrigger values rendered below are "cards"
            // and "table", so the callback value is always one of them.
            setView(value as "cards" | "table")
          }
        >
          <TabsList>
            <TabsTrigger value="cards">Card view</TabsTrigger>
            <TabsTrigger value="table">Table view</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <FilterAdminUserName />
        <FilterAdminUserEmail />
      </div>

      <Tabs value={view}>
        <TabsContent value="cards" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        {user.image && (
                          <AvatarImage
                            src={user.image}
                            alt={user.name || user.email}
                          />
                        )}
                        <AvatarFallback>
                          {getUserInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-base truncate">
                        {user.name || user.email}
                      </CardTitle>
                    </div>
                    {renderStatusBadge(user)}
                  </div>
                  <CardDescription className="truncate">
                    {user.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      Role: {user.role || "user"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      Joined:{" "}
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {user.banned && user.banReason && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Ban reason:</span>{" "}
                      {user.banReason}
                    </p>
                  )}

                  {renderActions(user)}
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No normal users yet</CardTitle>
                  <CardDescription>
                    Once users start signing up, they will appear here for
                    access control.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table" className={cn("mt-0")}>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {user.image && (
                            <AvatarImage
                              src={user.image}
                              alt={user.name || user.email}
                            />
                          )}
                          <AvatarFallback>
                            {getUserInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{renderStatusBadge(user)}</TableCell>
                    <TableCell>{user.role || "user"}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        {renderActions(user)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No non-admin users found.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </section>
  );
}
