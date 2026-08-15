import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchSession as getSession } from "#/lib/auth-session";
import { documentsService } from "#/features/documents/server/documents-service";
import { uploadFile } from "#/lib/storage";

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

function parseStringArray(value: FormDataEntryValue | null): string[] {
  if (value instanceof File || value === null || value.trim() === "") {
    return [];
  }

  try {
    const parsed = z.array(z.unknown()).safeParse(JSON.parse(value));
    return parsed.success
      ? parsed.data.filter(
          (item): item is string => z.string().safeParse(item).success,
        )
      : [];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/api/documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const { user } = authSession;
          const formData = await request.formData();
          // SAFETY: the file input submits a File; when absent, FormData
          // returns null for the "file" field.
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

          const url = await uploadFile(file, "/ATS");

          if (!url) {
            return Response.json(
              { error: "Failed to upload file to storage" },
              { status: 500 },
            );
          }

          const name = formData.get("name");
          if (name instanceof File || name === null || name.trim() === "") {
            return Response.json({ url }, { status: 200 });
          }

          const descriptionValue = formData.get("description");

          const result = await documentsService.createRecord({
            name,
            description:
              descriptionValue instanceof File
                ? ""
                : (descriptionValue ?? ""),
            categoryIds: parseStringArray(formData.get("categoryIds")),
            tags: parseStringArray(formData.get("tags")),
            url,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
          });

          if (!result.success) {
            const errorMessage = z.string().safeParse(result.error);
            return Response.json(
              {
                error: errorMessage.success
                  ? errorMessage.data
                  : "Failed to create document",
              },
              { status: 400 },
            );
          }

          return Response.json(
            { success: true, url, document: result.data },
            { status: 200 },
          );
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
