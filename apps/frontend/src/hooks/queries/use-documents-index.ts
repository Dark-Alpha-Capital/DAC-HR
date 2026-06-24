import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  documentsIndexQueryOptions,
  type DocumentsIndexDeps,
} from "~/lib/query/options/documents";

export function useDocumentsIndex(deps: DocumentsIndexDeps) {
  return useQuery({
    ...documentsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
