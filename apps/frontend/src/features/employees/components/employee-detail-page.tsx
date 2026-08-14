import { useQuery } from "@tanstack/react-query";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { employeeDetailQueryOptions } from "#/features/employees/server/queries/employees";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { Badge } from "#/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import BackButton from "#/components/shared/back-button";
import {
  Pencil,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  User,
  FileText,
} from "lucide-react";
import DeleteEmployeeButton from "#/features/employees/components/delete-employee-button";
import EmployeeProfileImage from "#/features/employees/components/employee-profile-image";
import { Markdown } from "#/components/shared/markdown";

export function EmployeeDetailPage() {
  const { id } = useParams({ from: "/_main/employees/$id/" });
  const { data, isLoading } = useQuery(employeeDetailQueryOptions(id));

  if (isLoading && !data) {
    return <DetailPageSkeleton container tabs showBreadcrumb />;
  }

  if (!data) {
    return null;
  }

  const { employee } = data;

  if (!employee) {
    return (
      <div className="block-space-mini container mx-auto">
        <BackButton />
        <div className="mt-4 md:mt-6 lg:mt-8 space-y-4">
          <h1 className="text-2xl font-semibold">Employee not found</h1>
          <p className="text-muted-foreground">
            The employee you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button asChild>
            <Link to="/employees" search={{} as never}>
              Back to Employees
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />

      <div className="mt-4 md:mt-6 lg:mt-8 space-y-8">
        <div className="flex items-start justify-between gap-4 pb-6 border-b">
          <div className="flex items-center gap-4 flex-1">
            {employee.profileImage ? (
              <EmployeeProfileImage
                imageUrl={employee.profileImage}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover border-2 border-border"
              />
            ) : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Calendar className="h-3 w-3" />
                </Badge>
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/employees/$id/edit" params={{ id: employee.id }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <DeleteEmployeeButton employeeId={employee.id} />
          </div>
        </div>

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
                </div>
              </div>

              {employee.position ? (
                <div className="flex items-start gap-4">
                  <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-3">Position</p>
                    <Link
                      to="/positions/$slug"
                      params={{ slug: employee.position.slug }}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {employee.position.name}
                    </Link>
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Employee ID:</span>{" "}
                <span className="font-mono">{employee.id}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bio" className="mt-6">
            {employee.bio ? (
              <div className="narrow-container max-w-none text-sm leading-6 text-foreground break-words">
                <Markdown>{employee.bio}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bio provided.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
