import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import { getEmployeeById, getEmployees } from "@workspace/db/modules/dashboard";
import { getPositions } from "@workspace/db/modules/positions";

type EmployeesIndexInput = {
  position?: string[];
  department?: string[];
  name?: string;
  email?: string;
  page?: number;
};

export const loadEmployeesIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: EmployeesIndexInput) => data)
  .handler(async ({ data: deps, context: { session } }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, employeesResult] = await Promise.all([
      getPositions(),
      getEmployees(
        deps.position,
        deps.department,
        deps.name,
        deps.email,
        currentPage,
        limit,
      ),
    ]);

    const { employees, total } = employeesResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      employees,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.position?.length ||
          deps.department?.length ||
          deps.name ||
          deps.email,
      ),
    };
  });

export const loadEmployeeDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context: { session } }) => {
    const employee = await getEmployeeById(data.id);
    return { employee };
  });

type EmployeeNewInput = {
  candidateId?: string;
  applicationId?: string;
};

export const loadEmployeeNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: EmployeeNewInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { positions } = await getPositions();
    const cleanedPositions = positions.map((position) => ({
      id: position.id,
      name: position.name,
    }));

    let candidateData = null;
    let applicationData = null;

    if (data.candidateId) {
      candidateData = await getCandidateWithApplications(data.candidateId);
      if (candidateData && data.applicationId) {
        applicationData =
          candidateData.applications.find((app) => app.id === data.applicationId) ??
          null;
      }
    }

    return {
      positions: cleanedPositions,
      candidateId: data.candidateId,
      candidateData,
      applicationData,
    };
  });

export const loadEmployeeEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context: { session } }) => {
    const [employee, { positions }] = await Promise.all([
      getEmployeeById(data.id),
      getPositions(),
    ]);

    return {
      employee,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
    };
  });

import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";

export function employeeDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => loadEmployeeDetail({ data: { id } }),
  });
}
