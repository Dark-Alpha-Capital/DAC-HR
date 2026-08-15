import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { documentsService } from "../documents-service";

type DocumentsIndexInput = {
  scope?: string;
  category?: string[];
  name?: string;
  tags?: string;
  candidateId?: string;
  page?: number;
};

export const loadDocumentsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: DocumentsIndexInput) => data)
  .handler(async ({ data: deps }) => documentsService.index(deps));
