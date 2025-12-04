import * as z from "zod";
import { departmentEnum } from "./employee-form-schema";

export const positionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Position name is required."),

  description: z
    .string()
    .min(1, "Description is required."),

  department: departmentEnum,
});

export type PositionFormSchema = z.infer<typeof positionFormSchema>;
