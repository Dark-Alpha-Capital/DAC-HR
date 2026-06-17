import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import { createDocumentRecord } from "~/lib/documents/create-document-record";
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

function parseStringArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
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

          const name = formData.get("name");
          if (typeof name !== "string" || name.trim() === "") {
            return Response.json({ url }, { status: 200 });
          }

          const result = await createDocumentRecord({
            name,
            description:
              typeof formData.get("description") === "string"
                ? formData.get("description")
                : "",
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
            return Response.json(
              {
                error:
                  typeof result.error === "string"
                    ? result.error
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
