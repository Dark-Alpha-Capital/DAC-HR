"use server";

import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema";
import {
  EmployeeFormSchema,
  employeeFormSchema,
} from "../schemas/employee-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateEmployee = async (
  employeeId: string,
  data: EmployeeFormSchema,
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = employeeFormSchema.safeParse(data);
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

    updateTag("employees");
    updateTag(`employee-${employeeId}`);
    revalidatePath("/employees");
    revalidatePath(`/employees/${employeeId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return { success: true, data: updatedEmployee };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update employee" };
  }
};
