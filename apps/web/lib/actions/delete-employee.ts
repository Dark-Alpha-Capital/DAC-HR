"use server";

import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";
import { getEmployeeById } from "@workspace/db/queries";

export const deleteEmployee = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get employee data before deletion for audit log
    const employeeData = await getEmployeeById(id);

    await db.delete(employee).where(eq(employee.id, id));

    updateTag("employees");
    updateTag(`employee-${id}`);
    revalidatePath("/employees");

    if (employeeData) {
      after(async () => {
        await insertAuditLog({
          userId: session.user.id,
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
