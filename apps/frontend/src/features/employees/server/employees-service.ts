import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { employee } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getEmployeeById } from "@workspace/db/modules/dashboard";
import type { EmployeeFormSchema } from "./schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type EmployeeFormData = EmployeeFormSchema;

export const createEmployee = async (input: EmployeeFormData, actor: Actor) => {
  const { firstName, lastName, department, positionId, profileImage, bio } =
    input;

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
};

export const updateEmployee = async (
  employeeId: string,
  input: EmployeeFormData,
  actor: Actor,
) => {
  const { firstName, lastName, department, positionId, profileImage, bio } =
    input;
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
};

export const deleteEmployee = async (id: string, actor: Actor) => {
  try {
    // Get employee data before deletion for audit log
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
};
