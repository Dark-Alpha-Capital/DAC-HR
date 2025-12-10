import React, { Suspense } from "react";
import { getTargetById } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { UserIsAdmin } from "@/components/auth-checks";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const target = await getTargetById(id);

  if (!target) {
    return {
      title: "Target Not Found - DAC HR",
      description: "The target you're looking for doesn't exist.",
    };
  }

  return {
    title: `Target - ${target.status} - DAC HR`,
    description: target.description.substring(0, 160),
  };
}

async function TargetContent({ id }: { id: string }) {
  const target = await getTargetById(id);

  if (!target) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/targets">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Targets
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Badge
              variant={target.status === "complete" ? "default" : "secondary"}
              className="flex items-center gap-1 w-fit"
            >
              {target.status === "complete" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {target.status}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Timeline: {format(new Date(target.timeline), "PPP 'at' p")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Created {format(new Date(target.createdAt), "PPP")}
            </div>
          </div>
          <Button asChild>
            <Link href={`/admin/targets/${id}/edit`}>Edit Target</Link>
          </Button>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Description</h2>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{target.description}</ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function TargetDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <Suspense fallback={<div>Loading target...</div>}>
        <TargetContent id={id} />
      </Suspense>
    </div>
  );
}
