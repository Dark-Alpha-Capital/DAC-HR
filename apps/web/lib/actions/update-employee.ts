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

  const { firstName, lastName, department, positionId, profileImage } =
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
      })
      .where(eq(employee.id, employeeId))
      .returning();

    if (!updatedEmployee) {
      return { error: "Failed to update employee" };
    }

    revalidatePath("/employees");
    revalidatePath(`/employees/${employeeId}`);

    return { success: true, data: updatedEmployee };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update employee" };
  }
};

