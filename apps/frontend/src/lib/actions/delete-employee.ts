import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { employee } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getEmployeeById } from "@workspace/db/modules/dashboard";

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {

  try {
    // Get employee data before deletion for audit log
    const employeeData = await getEmployeeById(id);

    await db.delete(employee).where(eq(employee.id, id));
    if (employeeData) {
      insertAuditLog({
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
});
