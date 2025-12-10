import React, { Suspense } from "react";
import { getAllTargets } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Metadata } from "next";
import { UserIsAdmin } from "@/components/auth-checks";

export const metadata: Metadata = {
  title: "Targets - Admin - DAC HR",
  description: "Manage organizational targets and goals",
};

async function TargetsList() {
  const targets = await getAllTargets();

  return (
    <div className="grid gap-4">
      {targets.map((target) => (
        <Link
          key={target.id}
          href={`/admin/targets/${target.id}`}
          className="block"
        >
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Badge
                variant={
                  target.status === "complete" ? "default" : "secondary"
                }
                className="flex items-center gap-1"
              >
                {target.status === "complete" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {target.status}
              </Badge>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(target.timeline), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none line-clamp-3">
              {target.description.substring(0, 200)}
              {target.description.length > 200 && "..."}
            </div>
          </div>
        </Link>
      ))}

      {targets.length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No targets yet. Create your first target to get started.
          </p>
          <Button asChild>
            <Link href="/admin/targets/new">Create Target</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default async function TargetsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Targets</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizational targets and goals
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/targets/new">Create Target</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading targets...</div>}>
        <TargetsList />
      </Suspense>
    </div>
  );
}
