"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns, Eye } from "lucide-react";
import ApplicationCard from "@/components/application-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { Card, CardContent } from "@workspace/ui/components/card";

type Application = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  position: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  interviews: Array<{
    id: string;
    status: string;
  }>;
};

interface ApplicationContainerProps {
  applications: Application[];
}

type ViewMode = "grid" | "table" | "kanban";

const ApplicationContainer = ({ applications }: ApplicationContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  // Group applications by position for kanban view
  const applicationsByPosition = useMemo(() => {
    const grouped = new Map<string, Application[]>();

    applications.forEach((application) => {
      const positionId = application.position.id;

      if (!grouped.has(positionId)) {
        grouped.set(positionId, []);
      }
      grouped.get(positionId)!.push(application);
    });

    // Get unique positions in the order they appear in applications
    const positionMap = new Map<string, { id: string; name: string }>();
    applications.forEach((application) => {
      if (!positionMap.has(application.position.id)) {
        positionMap.set(application.position.id, {
          id: application.position.id,
          name: application.position.name,
        });
      }
    });

    return Array.from(positionMap.values())
      .map((position) => ({
        id: position.id,
        name: position.name,
        applications: grouped.get(position.id) ?? [],
      }))
      .filter((column) => column.applications.length > 0);
  }, [applications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as ViewMode);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="grid" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <Columns className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
            />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Candidate</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">
                Position
              </TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Status</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">
                Interviews
              </TableHead>
              <TableHead className="text-right py-1.5 px-2 text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => {
              const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
              return (
                <TableRow key={application.id}>
                  <TableCell className="py-1.5 px-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {application.candidate.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {application.position.name}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm capitalize">
                    {application.status}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {application.interviews.length}
                  </TableCell>
                  <TableCell className="text-right py-1.5 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link href={`/applications/${application.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-3 md:gap-4 min-w-max pr-4">
            {applicationsByPosition.map((positionColumn) => (
              <div
                key={positionColumn.id}
                className="shrink-0 w-64 sm:w-72 md:w-80 flex flex-col"
              >
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {positionColumn.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {positionColumn.applications.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {positionColumn.applications.map((application) => {
                    const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
                    return (
                      <Card
                        key={application.id}
                        className="hover:shadow-sm transition-shadow py-2 px-2"
                      >
                        <CardContent className="p-2">
                          <div className="space-y-1.5">
                            <div>
                              <h4 className="font-medium leading-tight">
                                {fullName}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-tight">
                                {application.candidate.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 pt-1.5 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <Link href={`/applications/${application.id}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                              <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                                {application.status}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationContainer;





