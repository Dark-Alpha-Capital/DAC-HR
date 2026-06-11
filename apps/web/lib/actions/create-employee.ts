import { defineAction } from "./create-action";
import { db } from "@workspace/db/db";
import { employee } from "@workspace/db/schema";
import {
  EmployeeFormSchema,
  employeeFormSchema,
} from "../schemas/employee-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createEmployee = defineAction(async (data: EmployeeFormSchema) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = employeeFormSchema.safeParse(data);
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
    if (newEmployee) {
    }
    insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
});
