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

export const createEmployee = async (data: EmployeeFormSchema) => {
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
    const [newEmployee] = await db
      .insert(employee)
      .values({
        firstName,
        lastName,
        department,
        positionId: positionId || null,
        profileImage: profileImage || null,
      })
      .returning();

    if (!newEmployee) {
      return { error: "Failed to create employee" };
    }

    revalidatePath("/employees");

    return { success: true, data: newEmployee };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create employee" };
  }
};

