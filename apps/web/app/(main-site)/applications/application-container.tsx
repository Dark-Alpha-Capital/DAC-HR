import React from "react";
import { Eye } from "lucide-react";
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
  currentPage?: number;
  limit?: number;
}

const ApplicationContainer = ({
  applications,
  currentPage = 1,
  limit = 50,
}: ApplicationContainerProps) => {
  const startIndex = (currentPage - 1) * limit;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
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
        {applications.map((application, index) => {
          const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
          return (
            <TableRow key={application.id}>
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                {startIndex + index + 1}
              </TableCell>
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
                  variant="secondary"
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
  );
};

export default ApplicationContainer;
