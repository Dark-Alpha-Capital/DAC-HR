import { useQuery } from "@tanstack/react-query";
import {
  importStatusQueryOptions,
  type ImportStatus,
} from "~/lib/query/options/imports";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function useImportStatus(importId: string | null, enabled = true) {
  return useQuery({
    ...importStatusQueryOptions(importId ?? ""),
    enabled: Boolean(importId) && enabled,
    refetchInterval: (query) => {
      const status = (query.state.data as ImportStatus | undefined)?.import
        .status;
      if (!status || TERMINAL_STATUSES.has(status)) {
        return false;
      }
      return 2000;
    },
  });
}
