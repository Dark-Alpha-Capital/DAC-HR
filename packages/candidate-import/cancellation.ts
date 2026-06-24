import { getCandidateImportById } from "@workspace/db/repositories/candidate-import-repository";
import type { ProcessImportResult } from "./types";

export class ImportCancelledError extends Error {
  readonly partialResult?: ProcessImportResult;

  constructor(importId: string, partialResult?: ProcessImportResult) {
    super(`Import ${importId} was cancelled`);
    this.name = "ImportCancelledError";
    this.partialResult = partialResult;
  }
}

export async function throwIfImportCancelled(
  importId: string,
  partialResult?: ProcessImportResult,
): Promise<void> {
  const record = await getCandidateImportById(importId);
  if (record?.status === "cancelled") {
    throw new ImportCancelledError(importId, partialResult);
  }
}
