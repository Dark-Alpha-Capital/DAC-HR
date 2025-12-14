"use server";

import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema";
import {
  EmployeeFormSchema,
  employeeFormSchema,
} from "../schemas/employee-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const updateEmployee = async (
  employeeId: string,
  data: EmployeeFormSchema
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

  try {
    const [updatedEmployee] = await db
      .update(employee)
      .set({
        firstName,
        lastName,
        department,
        positionId: positionId || null,
        profileImage: profileImage || null,
        bio: bio || null,
      })
      .where(eq(employee.id, employeeId))
      .returning();

    if (!updatedEmployee) {
      return { error: "Failed to update employee" };
    }

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
            bio: bio || null,
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
