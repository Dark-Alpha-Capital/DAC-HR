import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { candidatesService } from "../candidates-service";
import type { CandidateFilters } from "../../kanban-types";

type CandidatesIndexInput = CandidateFilters & {
  page?: number;
  view?: "table" | "kanban";
};

export const loadCandidatesIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: CandidatesIndexInput) => data)
  .handler(async ({ data: deps }) => candidatesService.listIndex(deps));

export const loadCandidatesNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async ({ context: { session } }) =>
    candidatesService.getNewOptions(session),
  );

export const loadCandidateDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { uid: string; application?: string }) => data)
  .handler(async ({ data, context: { session } }) =>
    candidatesService.getDetail(data, session),
  );

export const loadCandidateEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: uid }) => candidatesService.getEdit(uid));

export const loadCandidateDocumentEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { uid: string; documentId: string }) => data)
  .handler(async ({ data }) =>
    candidatesService.getDocumentEdit(data.uid, data.documentId),
  );
