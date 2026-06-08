import { createFileRoute } from "@tanstack/react-router";
import { db, eq } from "@workspace/db";
import { candidateDocument as candidateDocumentSchema } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { candidateDocumentFormSchema } from "@/lib/schemas/candidate-document-form-schema";
import {
  createNextcloudClient,
  uploadFile as uploadToNextcloud,
} from "@workspace/nextcloud";
import { getSession } from "@/lib/middleware/auth-guard";

const getNextcloudConfig = () => {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;
  if (!url || !user || !password)
    throw new Error("Nextcloud configuration missing");
  return { url, user, password };
};

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

export const Route = createFileRoute("/api/candidate/$id/documents")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const candidateId = params.id;
          if (!candidateId)
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );

          const documents = await getDocumentsByCandidateId(candidateId);
          return Response.json({ documents }, { status: 200 });
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

      POST: async ({ request, params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const candidateId = params.id;
          if (!candidateId || candidateId.trim() === "") {
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );
          }

          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const name = formData.get("name") as string;
          const description = formData.get("description") as string | null;
          const category = formData.get("category") as
            | "resume"
            | "cover-letter"
            | "portfolio"
            | "other";
          const urlField = formData.get("url") as string | null;
          const tagsInput = formData.get("tags") as string | null;

          let tags: string[] = [];
          if (tagsInput) {
            try {
              tags = JSON.parse(tagsInput);
            } catch {
              tags = tagsInput
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
            }
          }

          let finalUrl: string;
          if (file) {
            const maxSize = 500 * 1024 * 1024;
            if (file.size > maxSize)
              return Response.json(
                { error: "File size exceeds 500MB limit" },
                { status: 400 },
              );
            if (VIDEO_TYPES.includes(file.type))
              return Response.json(
                { error: "Video files not allowed" },
                { status: 400 },
              );

            const nextcloudClient = createNextcloudClient(getNextcloudConfig());
            const nextcloudUploadResult = await uploadToNextcloud({
              client: nextcloudClient,
              file,
              folderPath: `/ATS/candidates/${candidateId}`,
            });

            if (
              !nextcloudUploadResult.success ||
              !nextcloudUploadResult.downloadUrl
            ) {
              return Response.json(
                { error: "Failed to upload file" },
                { status: 500 },
              );
            }
            finalUrl = nextcloudUploadResult.downloadUrl;
          } else if (urlField && urlField.trim() !== "") {
            try {
              new URL(urlField);
              finalUrl = urlField.trim();
            } catch {
              return Response.json(
                { error: "Invalid URL format" },
                { status: 400 },
              );
            }
          } else {
            return Response.json(
              { error: "Please provide a file or URL" },
              { status: 400 },
            );
          }

          const validationResult = candidateDocumentFormSchema.safeParse({
            name: name || "",
            description: description || "",
            category: category || "other",
            url: finalUrl,
            tags,
          });

          if (!validationResult.success) {
            return Response.json(
              { error: validationResult.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const validatedData = validationResult.data;
          const [newCandidateDocument] = await db
            .insert(candidateDocumentSchema)
            .values({
              candidateId,
              name: validatedData.name,
              description: validatedData.description?.trim() || null,
              category: validatedData.category || "other",
              url: validatedData.url,
              tags: validatedData.tags?.length ? validatedData.tags : null,
            })
            .returning();

          insertAuditLog({
            userId: user.id,
            action: "create_candidate_document",
            entityType: "candidate_document",
            entityId: newCandidateDocument?.id || "",
            details: {
              candidateDocument: {
                id: newCandidateDocument?.id,
                candidateId,
                name: validatedData.name,
                category: validatedData.category,
                url: validatedData.url,
                createdAt: newCandidateDocument?.createdAt.toISOString(),
              },
              createdBy: { id: user.id, email: user.email, name: user.name },
              metadata: { timestamp: new Date().toISOString() },
            },
          }).catch((err) => console.error("Audit log error:", err));

          return Response.json(
            { success: true, data: newCandidateDocument },
            { status: 201 },
          );
        } catch (error) {
          console.error(
            `Error creating candidate document after ${Date.now() - startTime}ms:`,
            error,
          );
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
