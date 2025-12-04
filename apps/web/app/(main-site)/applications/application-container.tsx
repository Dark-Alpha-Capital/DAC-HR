"use client";

import React, { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Eye } from "lucide-react";
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

type ViewMode = "grid" | "table";

const ApplicationContainer = ({ applications }: ApplicationContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Candidate</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Status</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Interviews</TableHead>
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
      )}
    </div>
  );
};

export default ApplicationContainer;
