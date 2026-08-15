import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { employee } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  getEmployeeById,
  getEmployees,
} from "@workspace/db/modules/dashboard";
import { getPositions } from "@workspace/db/modules/positions";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import {
  employeeFormSchema,
  type EmployeeFormSchema,
} from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

type EmployeesIndexInput = {
  position?: string[];
  department?: string[];
  name?: string;
  email?: string;
  page?: number;
};

export const employeesService = {
  async list(deps: EmployeesIndexInput) {
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
  },

  async getDetail(id: string) {
    const employee = await getEmployeeById(id);
    return { employee };
  },

  async getNewOptions(data: { candidateId?: string; applicationId?: string }) {
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
  },

  async getEditOptions(id: string) {
    const [employee, { positions }] = await Promise.all([
      getEmployeeById(id),
      getPositions(),
    ]);

    return {
      employee,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
    };
  },

  async create(input: EmployeeFormSchema, actor: Actor) {
    const result = employeeFormSchema.safeParse(input);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { firstName, lastName, department, positionId, profileImage, bio } =
      result.data;

    try {
      const [newEmployee] = await db
        .insert(employee)
        .values({
          firstName,
          lastName,
          department,
          positionId: positionId || null,
          profileImage: profileImage || null,
          bio: bio || null,
        })
        .returning();

      if (!newEmployee) {
        return { error: "Failed to create employee" };
      }
      insertAuditLog({
        userId: actor.id,
        action: "create_employee",
        entityType: "employee",
        entityId: newEmployee.id,
        details: {
          employee: {
            id: newEmployee.id,
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            department: newEmployee.department,
            positionId: newEmployee.positionId,
            profileImage: newEmployee.profileImage,
            bio: newEmployee.bio,
            createdAt: newEmployee.createdAt.toISOString(),
            updatedAt: newEmployee.updatedAt.toISOString(),
          },
          input: {
            firstName,
            lastName,
            department,
            positionId: positionId || null,
            profileImage: profileImage || null,
            bio: bio || null,
          },
          createdBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newEmployee };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create employee" };
    }
  },

  async update(employeeId: string, input: EmployeeFormSchema, actor: Actor) {
    const result = employeeFormSchema.safeParse(input);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { firstName, lastName, department, positionId, profileImage, bio } =
      result.data;
    const normalizedBio = bio?.trim() || null;

    try {
      const [updatedEmployee] = await db
        .update(employee)
        .set({
          firstName,
          lastName,
          department,
          positionId: positionId || null,
          profileImage: profileImage || null,
          bio: normalizedBio,
        })
        .where(eq(employee.id, employeeId))
        .returning();

      if (!updatedEmployee) {
        return { error: "Failed to update employee" };
      }
      insertAuditLog({
        userId: actor.id,
        action: "update_employee",
        entityType: "employee",
        entityId: updatedEmployee.id,
        details: {
          employee: {
            id: updatedEmployee.id,
            firstName: updatedEmployee.firstName,
            lastName: updatedEmployee.lastName,
            department: updatedEmployee.department,
            positionId: updatedEmployee.positionId,
            profileImage: updatedEmployee.profileImage,
            bio: updatedEmployee.bio,
            updatedAt: updatedEmployee.updatedAt.toISOString(),
          },
          input: {
            firstName,
            lastName,
            department,
            positionId: positionId || null,
            profileImage: profileImage || null,
            bio: normalizedBio,
          },
          updatedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: updatedEmployee };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to update employee" };
    }
  },

  async delete(id: string, actor: Actor) {
    try {
      const employeeData = await getEmployeeById(id);

      await db.delete(employee).where(eq(employee.id, id));
      if (employeeData) {
        insertAuditLog({
          userId: actor.id,
          action: "delete_employee",
          entityType: "employee",
          entityId: id,
          details: {
            employee: {
              id: employeeData.id,
              firstName: employeeData.firstName,
              lastName: employeeData.lastName,
              department: employeeData.department,
              positionId: employeeData.positionId,
              profileImage: employeeData.profileImage,
              bio: employeeData.bio,
            },
            deletedBy: {
              id: actor.id,
              email: actor.email,
              name: actor.name,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        }).catch((error) => console.error("Audit log error:", error));
      }

      return { success: true };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to delete employee" };
    }
  },
};
