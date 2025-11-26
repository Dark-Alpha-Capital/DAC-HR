"use client";

import React, { useMemo, useState, useTransition } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
import EmployeeCard from "@/components/employee-card";
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
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import DeleteEmployeeButton from "@/components/delete-employee-button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { deleteEmployee } from "@/lib/actions/delete-employee";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { employee } from "@workspace/db/schema";

type Employee = InferSelectModel<typeof employee> & {
  position: { id: string; name: string; slug: string } | null;
};

interface EmployeeContainerProps {
  employees: Employee[];
}

type ViewMode = "grid" | "table" | "kanban";

const DeleteEmployeeIconButton = ({ employeeId }: { employeeId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteEmployee(employeeId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Employee deleted successfully");
            router.refresh();
          }
        });
      }}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
    </Button>
  );
};

const EmployeeContainer = ({ employees }: EmployeeContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Group employees by department for kanban view
  const employeesByDepartment = useMemo(() => {
    const grouped = new Map<string, Employee[]>();

    employees.forEach((employee) => {
      const departmentKey = employee.department || "unassigned";
      const departmentName =
        departmentKey.charAt(0).toUpperCase() +
        departmentKey.slice(1).replace("-", " ");

      if (!grouped.has(departmentKey)) {
        grouped.set(departmentKey, []);
      }
      grouped.get(departmentKey)!.push(employee);
    });

    return Array.from(grouped.entries()).map(([id, employees]) => ({
      id,
      name: employees[0]?.department
        ? employees[0].department.charAt(0).toUpperCase() +
          employees[0].department.slice(1).replace("-", " ")
        : "Unassigned",
      employees,
    }));
  }, [employees]);

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
          <ToggleGroupItem value="grid" aria-label="Grid view">
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
          {employees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Department</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
              <TableHead className="text-right py-1.5 px-2 text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const fullName = `${employee.firstName} ${employee.lastName}`;
              const departmentName =
                employee.department.charAt(0).toUpperCase() +
                employee.department.slice(1).replace("-", " ");
              return (
                <TableRow key={employee.id}>
                  <TableCell className="py-1.5 px-2 font-medium text-sm">
                    {fullName}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {departmentName}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm">
                    {employee.position?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right py-1.5 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/employees/${employee.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <Link href={`/employees/${employee.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteEmployeeIconButton employeeId={employee.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {employeesByDepartment.map((department) => (
              <div key={department.id} className="shrink-0 w-72 flex flex-col">
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {department.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {department.employees.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {department.employees.map((employee) => {
                    const fullName = `${employee.firstName} ${employee.lastName}`;
                    return (
                      <Card
                        key={employee.id}
                        className="hover:shadow-sm transition-shadow py-2 px-2"
                      >
                        <CardContent className="p-2">
                          <div className="space-y-1.5">
                            <div>
                              <h4 className="font-medium leading-tight">
                                {fullName}
                              </h4>
                              {employee.position && (
                                <p className="text-xs text-muted-foreground leading-tight">
                                  {employee.position.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 pt-1.5 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <Link href={`/employees/${employee.id}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <Link href={`/employees/${employee.id}/edit`}>
                                  <Pencil className="h-3 w-3" />
                                </Link>
                              </Button>
                              <div className="ml-auto">
                                <DeleteEmployeeButton
                                  employeeId={employee.id}
                                />
                              </div>
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

export default EmployeeContainer;
