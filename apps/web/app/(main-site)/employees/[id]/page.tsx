import React, { Suspense } from "react";
import { getEmployeeById } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Pencil,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  User,
  FileText,
} from "lucide-react";
import DeleteEmployeeButton from "@/components/delete-employee-button";
import { formatDate, formatDepartments } from "@/lib/utils";
import EmployeeProfileImage from "@/components/employee-profile-image";
import { cacheLife, cacheTag } from "next/cache";

type Params = Promise<{ id: string }>;

const EmployeePage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense fallback={<div>Loading...</div>}>
          <DisplayEmployeeWrapper params={params} />
        </Suspense>
      </div>
    </div>
  );
};

export default EmployeePage;

// Cached function for employee by ID
async function CachedEmployeeById(employeeId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("employees");
  cacheTag(`employee-${employeeId}`);

  return await getEmployeeById(employeeId);
}

// Component (not cached) reads runtime data
const DisplayEmployeeWrapper = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const employee = await CachedEmployeeById(id);

  console.log("employee", employee);

  if (!employee) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Employee not found</h1>
        <p className="text-muted-foreground">
          The employee you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b">
        <div className="flex items-center gap-4 flex-1">
          {employee.profileImage && (
            <EmployeeProfileImage
              imageUrl={employee.profileImage}
              alt={fullName}
              className="h-24 w-24 rounded-full object-cover border-2 border-border"
            />
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Calendar className="h-3 w-3" />
                Created {formatDate(employee.createdAt)}
              </Badge>
              {employee.updatedAt &&
                employee.updatedAt.getTime() !==
                  employee.createdAt.getTime() && (
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Clock className="h-3 w-3" />
                    Updated {formatDate(employee.updatedAt)}
                  </Badge>
                )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/employees/${employee.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DeleteEmployeeButton employeeId={employee.id} />
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="bio" className="gap-2">
            <FileText className="h-4 w-4" />
            Bio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-3">Department</p>
                <div className="flex flex-wrap gap-2">
                  {formatDepartments(employee.department).map((dept, idx) => (
                    <Badge key={idx} variant="secondary">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {employee.position && (
              <div className="flex items-start gap-4">
                <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-3">Position</p>
                  <Link
                    href={`/positions/${employee.position.slug}`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {employee.position.name}
                  </Link>
                </div>
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Employee ID:</span>{" "}
              <span className="font-mono">{employee.id}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bio" className="mt-6">
          {employee.bio ? (
            <div className="narrow-container max-w-none text-sm leading-6 text-foreground whitespace-pre-line break-words">
              {employee.bio}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No bio provided.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
