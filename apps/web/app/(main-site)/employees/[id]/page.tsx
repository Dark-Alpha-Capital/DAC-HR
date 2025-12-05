import React, { Suspense } from "react";
import { getEmployeeById } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import { Pencil, Calendar, Clock, Building2, Briefcase } from "lucide-react";
import DeleteEmployeeButton from "@/components/delete-employee-button";
import { formatDate } from "@/lib/utils";
import EmployeeProfileImage from "@/components/employee-profile-image";
import { RichTextEditor } from "@/components/rich-text-editor";

type Params = Promise<{ id: string }>;

const EmployeePage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />

      <Suspense fallback={<div>Loading...</div>}>
        <DisplayEmployee params={params} />
      </Suspense>
    </div>
  );
};

export default EmployeePage;

const DisplayEmployee = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The employee you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/employees">Back to Employees</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-4">
                {employee.profileImage && (
                  <EmployeeProfileImage
                    imageUrl={employee.profileImage}
                    alt={fullName}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                )}
                <CardTitle className="text-3xl font-bold">{fullName}</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(employee.createdAt)}
                </Badge>
                {employee.updatedAt &&
                  employee.updatedAt.getTime() !==
                    employee.createdAt.getTime() && (
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(employee.updatedAt)}
                    </Badge>
                  )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/employees/${employee.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <DeleteEmployeeButton employeeId={employee.id} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mt-4 md:mt-6 lg:mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Employee Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Department</p>
                <Badge variant="secondary" className="mt-1">
                  {employee.department.charAt(0).toUpperCase() +
                    employee.department.slice(1).replace("-", " ")}
                </Badge>
              </div>
            </div>
            {employee.position && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Position</p>
                  <div className="mt-1">
                    <Link
                      href={`/positions/${employee.position.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {employee.position.name}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="pt-6">
          <div className="text-xs text-muted-foreground w-full">
            <span className="font-medium">ID:</span>{" "}
            <span className="font-mono">{employee.id}</span>
          </div>
        </CardFooter>
      </Card>

      {employee.bio && (
        <Card className="mt-4 md:mt-6 lg:mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Bio</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <RichTextEditor
              content={employee.bio}
              editable={false}
              className="border-0 shadow-none"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

