import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { fetchSession as getSession } from "#/lib/auth-session";
import {
  cancelCandidateImport,
  getCandidateImportById,
  getCandidateImportRows,
  getCandidateImportWorkflowId,
} from "@workspace/db/repositories/candidate-import-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const Route = createFileRoute("/api/candidate/import/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const importId = params.id;
          if (!importId) {
            return Response.json({ error: "Import ID is required" }, { status: 400 });
          }

          const importJob = await getCandidateImportById(importId);
          if (!importJob) {
            return Response.json({ error: "Import not found" }, { status: 404 });
          }

          const rows = await getCandidateImportRows(importId);

          return Response.json(
            {
              import: importJob,
              rows,
              summary: {
                total: importJob.totalCandidates,
                processed: importJob.processedCandidates,
                failed: importJob.failedCandidates,
                skipped: rows.filter((row) => row.status === "skipped").length,
                succeeded: rows.filter((row) => row.status === "success").length,
              },
            },
            { status: 200 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const importId = params.id;
          if (!importId) {
            return Response.json({ error: "Import ID is required" }, { status: 400 });
          }

          const importJob = await getCandidateImportById(importId);
          if (!importJob) {
            return Response.json({ error: "Import not found" }, { status: 404 });
          }

          const { cancelled } = await cancelCandidateImport(importId);
          if (!cancelled) {
            return Response.json(
              { error: "Import cannot be cancelled in its current state" },
              { status: 409 },
            );
          }

          const workflow = (env)
            .CANDIDATE_IMPORT_WORKFLOW as
            | {
                get: (id: string) => Promise<{ terminate: () => Promise<void> }>;
              }
            | undefined;

          if (workflow) {
            try {
              const instance = await workflow.get(
                getCandidateImportWorkflowId(importId),
              );
              await instance.terminate();
            } catch (terminateError) {
              console.info(
                JSON.stringify({
                  event: "candidate_import_terminate_skipped",
                  importId,
                  error:
                    terminateError instanceof Error
                      ? terminateError.message
                      : String(terminateError),
                }),
              );
            }
          }

          await insertAuditLog({
            userId: authSession.user.id,
            action: "candidate_import_cancelled",
            entityType: "candidate_import",
            entityId: importId,
            details: { importId, filename: importJob.filename },
          }).catch(() => {});

          const updated = await getCandidateImportById(importId);

          return Response.json(
            { success: true, import: updated },
            { status: 200 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
