import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/query-keys";

export type ImportStatus = {
  import: {
    id: string;
    status: string;
    filename: string;
    type: string;
    totalCandidates: number;
    processedCandidates: number;
    failedCandidates: number;
    error?: string | null;
  };
  summary: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    succeeded: number;
  };
  rows: Array<{
    rowIndex: number;
    status: string;
    error?: string | null;
  }>;
};

export function importStatusQueryOptions(importId: string) {
  return queryOptions({
    queryKey: queryKeys.imports.status(importId),
    queryFn: async (): Promise<ImportStatus> => {
      const response = await fetch(`/api/candidate/import/${importId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch import status");
      }
      return response.json();
    },
  });
}
