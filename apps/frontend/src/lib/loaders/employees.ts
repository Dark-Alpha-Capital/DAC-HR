import { createServerFn } from "@tanstack/react-start";
import {
  getCandidateWithApplications,
  getEmployeeById,
  getEmployees,
  getPositions,
} from "@workspace/db/queries";

type EmployeesIndexInput = {
  position?: string[];
  department?: string[];
  name?: string;
  email?: string;
  page?: number;
};

export const loadEmployeesIndex = createServerFn({ method: "GET" })
  .validator((data: EmployeesIndexInput) => data)
  .handler(async ({ data: deps }) => {
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
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const employee = await getEmployeeById(data.id);
    return { employee };
  });

type EmployeeNewInput = {
  candidateId?: string;
  applicationId?: string;
};

export const loadEmployeeNew = createServerFn({ method: "GET" })
  .validator((data: EmployeeNewInput) => data)
  .handler(async ({ data }) => {
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
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
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
