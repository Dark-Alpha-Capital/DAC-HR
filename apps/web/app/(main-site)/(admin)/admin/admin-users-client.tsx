"use client";

import * as React from "react";
import { authClient } from "@/auth-client";
import { cn } from "@workspace/ui/lib/utils";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCcw,
} from "lucide-react";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
};

type Props = {
  users: AdminUser[];
};

type ActionState = {
  banning: boolean;
  unbanning: boolean;
  revokingSessions: boolean;
  error: string | null;
};

export function AdminUsersClient({ users }: Props) {
  const [view, setView] = React.useState<"cards" | "table">("cards");
  const [userStates, setUserStates] = React.useState<
    Record<string, ActionState>
  >(() =>
    Object.fromEntries(
      users.map((u) => [
        u.id,
        {
          banning: false,
          unbanning: false,
          revokingSessions: false,
          error: null,
        },
      ])
    )
  );

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
    try {
      await authClient.admin.banUser({
        userId,
        banReason: "Banned by admin from Admin Dashboard",
      });
    } catch (error) {
      console.error("Error banning user", error);
      updateState(userId, { error: "Failed to ban user. Please try again." });
    } finally {
      updateState(userId, { banning: false });
    }
  };

  const handleUnban = async (userId: string) => {
    updateState(userId, { unbanning: true, error: null });
    try {
      await authClient.admin.unbanUser({ userId });
    } catch (error) {
      console.error("Error unbanning user", error);
      updateState(userId, { error: "Failed to unban user. Please try again." });
    } finally {
      updateState(userId, { unbanning: false });
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    updateState(userId, { revokingSessions: true, error: null });
    try {
      await authClient.admin.revokeUserSessions({ userId });
    } catch (error) {
      console.error("Error revoking user sessions", error);
      updateState(userId, {
        error: "Failed to revoke sessions. Please try again.",
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
      <Badge variant="outline" className="flex items-center gap-1">
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
            variant={user.banned ? "outline" : "destructive"}
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
            variant="outline"
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
          onValueChange={(value) => setView(value as "cards" | "table")}
        >
          <TabsList>
            <TabsTrigger value="cards">Card view</TabsTrigger>
            <TabsTrigger value="table">Table view</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={view}>
        <TabsContent value="cards" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">
                      {user.name || user.email}
                    </CardTitle>
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
                    <TableCell className="font-medium">
                      {user.name || "-"}
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
    </section>
  );
}
