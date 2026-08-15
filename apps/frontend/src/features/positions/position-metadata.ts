import * as z from "zod";
import { departmentEnum } from "#/features/employees/schemas";
import {
  hireLevelEnum,
  positionStatusEnum,
} from "#/features/positions/schemas";

export const departmentLabels = {
  management: "Management",
  "capital-markets": "Capital Markets",
  "deal-team": "Deal Team",
  legal: "Legal",
  operations: "Operations",
  origination: "Origination",
  pipe: "PIPE",
  "public-markets": "Public Markets",
} satisfies Record<z.infer<typeof departmentEnum>, string>;

export const hireLevelLabels = {
  "managing-director": "Managing Director",
  "vice-president": "Vice President",
  associate: "Associate",
  analyst: "Analyst",
  intern: "Intern",
} satisfies Record<z.infer<typeof hireLevelEnum>, string>;

export const statusLabels = {
  active: "Active",
  hold: "Hold",
  passed: "Passed",
  upcoming: "Upcoming",
} satisfies Record<z.infer<typeof positionStatusEnum>, string>;

/** Status badge classes shared by the list, detail, and form screens. */
export function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    case "hold":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    case "passed":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
    case "upcoming":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  }
}
