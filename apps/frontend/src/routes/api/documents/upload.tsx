import { createFileRoute } from "@tanstack/react-router";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getSession } from "~/lib/middleware/auth-guard";
import { uploadFile } from "~/lib/storage";

const VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/webm",
  "video/ogg",
  "video/x-matroska",
  "video/3gpp",
  "video/x-flv",
];

export const Route = createFileRoute("/api/documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const { user } = authSession;
          const formData = await request.formData();
          const file = formData.get("file") as File | null;

          if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }

          const maxSize = 500 * 1024 * 1024;
          if (file.size > maxSize) {
            return Response.json(
              { error: "File size exceeds 500MB limit" },
              { status: 400 },
            );
          }

          if (VIDEO_TYPES.includes(file.type)) {
            return Response.json(
              {
                error:
                  "Video files are not allowed. Please upload other file types.",
              },
              { status: 400 },
            );
          }

          const url = await uploadFile(file, "/Documents");

          if (!url) {
            return Response.json(
              { error: "Failed to upload file to storage" },
              { status: 500 },
            );
          }

          insertAuditLog({
            userId: user.id,
            action: "upload_document",
            entityType: "document",
            entityId: url,
            details: {
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url,
              },
              uploadedBy: {
                id: user.id,
                email: user.email,
                name: user.name,
              },
              metadata: {
                timestamp: new Date().toISOString(),
              },
            },
          }).catch((err) => console.error("Audit log error:", err));

          return Response.json({ url }, { status: 200 });
        } catch (error) {
          console.error("Error uploading file:", error);
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
