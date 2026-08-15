import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidatesService } from "#/features/candidates/server/candidates-service";

import { candidateDocumentFormSchema } from "#/features/candidates/candidate-document-schemas";

import {
  buildNamedEntityFolderPath,
  formatPersonName,
  uploadFile as uploadToNextcloud,
} from "@workspace/nextcloud";
import { getServerNextcloudClient } from "#/lib/nextcloud-server";

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

          const { documents } = await candidatesService.listDocuments(candidateId);
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
          // SAFETY: the file input submits a File; when absent, FormData
          // returns null for the "file" field.
          const file = formData.get("file") as File | null;
          // SAFETY: name is a required text input, so FormData yields a string.
          const name = formData.get("name") as string;
          // SAFETY: description is an optional text field.
          const description = formData.get("description") as string | null;
          // SAFETY: the category select submits one of the four allowed values.
          const category = formData.get("category") as
            | "resume"
            | "cover-letter"
            | "portfolio"
            | "other";
          // SAFETY: url is an optional text field.
          const urlField = formData.get("url") as string | null;
          // SAFETY: tags is an optional text field.
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
          let nextcloudFilePath: string | undefined;
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

            const { candidate: candidateRecord } = await candidatesService.getEdit(candidateId);
            const folderPath = buildNamedEntityFolderPath({
              root: "/ATS/candidates",
              name: candidateRecord
                ? formatPersonName(
                    candidateRecord.firstName,
                    candidateRecord.lastName,
                  )
                : null,
              id: candidateId,
            });

            const nextcloudUploadResult = await uploadToNextcloud({
              client: getServerNextcloudClient(),
              file,
              folderPath,
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
            nextcloudFilePath = nextcloudUploadResult.filePath;
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
          const newCandidateDocument = await candidatesService.createDocument(
            {
              candidateId,
              name: validatedData.name,
              description: validatedData.description?.trim() || null,
              category: validatedData.category || "other",
              url: validatedData.url,
              tags: validatedData.tags?.length ? validatedData.tags : undefined,
              nextcloudFilePath,
            },
            user,
          );

          if (newCandidateDocument && nextcloudFilePath) {
            env.DOCUMENT_INDEXING_WORKFLOW &&
              env.DOCUMENT_INDEXING_WORKFLOW.create({
                id: `index-${newCandidateDocument.id}`,
                params: {
                  documentId: newCandidateDocument.id,
                  nextcloudFilePath,
                },
              })
                .catch((err) =>
                  console.error(
                    "Failed to start document indexing workflow:",
                    err,
                  ),
                );
          }

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
