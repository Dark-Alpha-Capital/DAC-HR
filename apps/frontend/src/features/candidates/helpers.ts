import { z } from "zod";
import {
  isCandidateSortOption,
  type CandidateSortOption,
} from "#/features/candidates/constants";

export type CandidateViewMode = "table" | "kanban";

export function toCandidateSort<T>(value: T): CandidateSortOption | undefined {
  const parsed = z.string().safeParse(value);
  if (parsed.success && isCandidateSortOption(parsed.data)) {
    return parsed.data;
  }
  return undefined;
}

export function toCandidateView<T>(value: T): CandidateViewMode {
  return value === "kanban" ? "kanban" : "table";
}
