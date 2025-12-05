import * as z from "zod";

export const departmentEnum = z.enum([
  "engineering",
  "product",
  "sales",
  "marketing",
  "hr",
  "finance",
  "operations",
  "legal",
  "customer-support",
  "other",
]);

export const employeeFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required.")
    .max(50, "First name must be at most 50 characters."),
  lastName: z
    .string()
    .min(1, "Last name is required.")
    .max(50, "Last name must be at most 50 characters."),
  department: departmentEnum,
  positionId: z.string().nullable(),
  profileImage: z.string().nullable(),
  bio: z.string().nullable().optional(),
});

export type EmployeeFormSchema = z.infer<typeof employeeFormSchema>;
