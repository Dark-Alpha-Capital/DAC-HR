import React, { Suspense } from "react";
import { getWeeklyCheckins, getPositions } from "@workspace/db/queries";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import Link from "next/link";
import { ShieldAlert, Calendar, Users, BarChart3, FileText } from "lucide-react";
import { hasWeeklyCheckinViewerAccess } from "@/lib/config/weekly-checkin-access";
import { sourcingChannelLabels } from "@/lib/schemas/weekly-checkin-form-schema";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import PaginationControls from "@/components/pagination-controls";

export const metadata: Metadata = {
  title: "Weekly Check-in Records",
  description: "View all submitted weekly recruiting check-ins",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayRecords searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayRecords({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!userSession) {
    redirect("/login");
  }

  // Check if the user has access
  if (!hasWeeklyCheckinViewerAccess(userSession.user.email)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to view weekly check-in records. Please
          contact an administrator if you believe this is an error.
        </p>
        <Button asChild>
          <Link href={{ pathname: "/dashboard" }}>Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const params = await searchParams;
  // Extract page number (default to 1)
  const page = params.page
    ? typeof params.page === "string"
      ? parseInt(params.page, 10)
      : Array.isArray(params.page) && params.page[0]
        ? parseInt(params.page[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  const limit = 50;

  const [{ checkins, total }, { positions }] = await Promise.all([
    getWeeklyCheckins(currentPage, limit),
    getPositions(),
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Create a map of position IDs to names
  const positionMap = new Map(positions.map((p) => [p.id, p.name]));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatWeekRange = (start: Date, end: Date) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly Check-in Records
          </h1>
          <p className="text-sm text-muted-foreground">
            View all submitted weekly recruiting reports
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={{ pathname: "/weekly-checkin" }}>Submit New Check-in</Link>
        </Button>
      </div>

      {checkins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No check-ins recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {checkins.map((checkin) => (
            <Card key={checkin.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {checkin.recruiterName}
                    </CardTitle>
                    <CardDescription>
                      {formatWeekRange(checkin.weekStartDate, checkin.weekEndDate)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(checkin.createdAt)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {/* Pipeline Stats */}
                  <AccordionItem value="pipeline">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Pipeline Statistics
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.candidatesSourced ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sourced
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.candidatesScreened ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Screened
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.candidatesRejected ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rejected
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.candidatesAdvanced2ndRound ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            2nd Round
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.candidatesAdvanced3rdRound ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            3rd Round
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.offersExtended ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Offers Extended
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-semibold">
                            {checkin.offersAccepted ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Offers Accepted
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Positions & Channels */}
                  <AccordionItem value="channels">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Positions & Channels
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {checkin.positionsWorked &&
                          checkin.positionsWorked.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Positions Worked On:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {checkin.positionsWorked.map((posId) => (
                                  <Badge key={posId} variant="outline">
                                    {positionMap.get(posId) || posId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {checkin.bestPerformingChannels &&
                          checkin.bestPerformingChannels.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Best Performing Channels:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {checkin.bestPerformingChannels.map((channel) => (
                                  <Badge key={channel} variant="secondary">
                                    {sourcingChannelLabels[
                                      channel as keyof typeof sourcingChannelLabels
                                    ] || channel}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {checkin.avgTimeToScreen && (
                          <div>
                            <p className="text-sm font-medium mb-1">
                              Avg. Time to Screen:
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {checkin.avgTimeToScreen}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Notes */}
                  {(checkin.delaysOrBottlenecks ||
                    checkin.concernsOrEscalations ||
                    checkin.supportNeeded) && (
                    <AccordionItem value="notes">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notes & Issues
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {checkin.delaysOrBottlenecks && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Delays/Bottlenecks:
                              </p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {checkin.delaysOrBottlenecks}
                              </p>
                            </div>
                          )}
                          {checkin.concernsOrEscalations && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Concerns/Escalations:
                              </p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {checkin.concernsOrEscalations}
                              </p>
                            </div>
                          )}
                          {checkin.supportNeeded && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Support Needed:
                              </p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {checkin.supportNeeded}
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              basePath="/weekly-checkin/records"
            />
          )}
        </div>
      )}
    </div>
  );
}
