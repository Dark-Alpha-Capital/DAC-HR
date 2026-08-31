import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import {
  detectBulkUploadTypeFromFilename,
  importLog,
} from "@workspace/candidate-import";
import {
  buildImportFolderPath,
  uploadFile as uploadToNextcloud,
} from "@workspace/nextcloud";
import { getServerNextcloudClient } from "#/lib/nextcloud-server";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidatesService } from "#/features/candidates/server/candidates-service";

const MAX_IMPORT_SIZE = 500 * 1024 * 1024;

export const Route = createFileRoute("/api/candidate/import/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const formData = await request.formData();
          const file = formData.get("file");
          const positionIdEntry = formData.get("positionId");
          const positionId = (
            positionIdEntry instanceof File ? null : positionIdEntry
          )?.trim();

          if (!(file instanceof File)) {
            return Response.json(
              { error: "File is required" },
              { status: 400 },
            );
          }

          if (file.size > MAX_IMPORT_SIZE) {
            return Response.json(
              { error: "File size exceeds 500MB limit" },
              { status: 400 },
            );
          }

          const importType = detectBulkUploadTypeFromFilename(file.name);
          if (!importType) {
            return Response.json(
              {
                error:
                  "Unsupported file type. Use CSV, ZIP, or a single PDF/DOCX resume.",
              },
              { status: 400 },
            );
          }

          importLog("log", "Import upload received", {
            step: "api.upload.received",
            fileType: importType,
            filename: file.name,
            fileSize: file.size,
            positionId: positionId || null,
            uploadedBy: authSession.user.id,
          });

          const importRecord = await candidatesService.createImportRecord({
            filename: file.name,
            type: importType,
            uploadedBy: authSession.user.id,
            originalFileUrl: "pending",
            positionId: positionId || null,
          });

          if (!importRecord) {
            return Response.json(
              { error: "Failed to create import job" },
              { status: 500 },
            );
          }

          importLog("log", "Import job created", {
            step: "api.upload.job_created",
            importId: importRecord.id,
            fileType: importType,
            filename: file.name,
          });

          const folderPath = buildImportFolderPath(importRecord.id);
          const client = getServerNextcloudClient();
          const uploadResult = await uploadToNextcloud({
            client,
            file,
            fileName: file.name,
            folderPath,
          });

          if (!uploadResult.success || !uploadResult.downloadUrl) {
            importLog("error", "Nextcloud upload failed", {
              step: "api.upload.nextcloud_failed",
              importId: importRecord.id,
              fileType: importType,
              error: uploadResult.error ?? "Upload failed",
            });
            await candidatesService.updateImportStatus(
              importRecord.id,
              "failed",
              {
                error: uploadResult.error ?? "Upload failed",
              },
            );
            return Response.json(
              { error: uploadResult.error ?? "Failed to upload file" },
              { status: 500 },
            );
          }

          importLog("log", "File stored in Nextcloud", {
            step: "api.upload.nextcloud_stored",
            importId: importRecord.id,
            fileType: importType,
            folderPath,
            downloadUrl: uploadResult.downloadUrl,
          });

          await candidatesService.updateImportOriginalFileUrl(
            importRecord.id,
            uploadResult.downloadUrl,
          );

          const workflow = env.CANDIDATE_IMPORT_WORKFLOW;

          if (workflow) {
            await workflow
              .create({
                id: `import-${importRecord.id}`,
                params: {
                  importId: importRecord.id,
                  uploadedBy: authSession.user.id,
                },
              })
              .then(() => {
                importLog("log", "Import workflow started", {
                  step: "api.upload.workflow_started",
                  importId: importRecord.id,
                  fileType: importType,
                });
              })
              .catch((error) => {
                importLog(
                  "error",
                  "Failed to start candidate import workflow",
                  {
                    step: "api.upload.workflow_failed",
                    importId: importRecord.id,
                    fileType: importType,
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                );
              });
          } else {
            importLog(
              "warn",
              "Workflow binding missing — import will not process",
              {
                step: "api.upload.workflow_missing",
                importId: importRecord.id,
                fileType: importType,
              },
            );
          }

          candidatesService
            .insertAudit({
              userId: authSession.user.id,
              action: "candidate_import_started",
              entityType: "candidate_import",
              entityId: importRecord.id,
              details: {
                filename: file.name,
                type: importType,
                positionId: positionId || null,
              },
            })
            .catch(() => {});

          return Response.json(
            {
              importId: importRecord.id,
              status: "pending",
            },
            { status: 202 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },

      GET: async () => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const imports = await candidatesService.listRecentImports();

          return Response.json({ imports }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
