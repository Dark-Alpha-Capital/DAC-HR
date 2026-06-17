import * as z from "zod";
import { departmentEnum } from "./employee-form-schema";

export const hireLevelEnum = z.enum([
  "managing-director",
  "vice-president",
  "associate",
  "analyst",
  "intern",
]);

export const positionStatusEnum = z.enum([
  "active",
  "hold",
  "passed",
  "upcoming",
]);

export const positionFormSchema = z.object({
  name: z.string().min(1, "Position name is required."),

  description: z.string().min(1, "Description is required."),

  department: z
    .array(departmentEnum)
    .min(1, "At least one department must be selected."),

  hireLevel: hireLevelEnum.optional(),

  status: positionStatusEnum.default("active"),
});

export type PositionFormSchema = z.infer<typeof positionFormSchema>;
