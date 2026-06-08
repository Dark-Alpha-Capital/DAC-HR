import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/middleware/auth-guard";
import { uploadDocument } from "@/lib/r2-storage";

export const Route = createFileRoute("/api/documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const name = formData.get("name") as string;
          const category = formData.get("category") as string;
          const tags = formData.get("tags") as string;

          if (!file) {
            return Response.json(
              { error: "File is required" },
              { status: 400 },
            );
          }

          const key = `documents/${Date.now()}-${name || file.name}`;
          const uploadedKey = await uploadDocument(key, file, file.type);

          if (!uploadedKey) {
            return Response.json(
              { error: "Failed to upload document" },
              { status: 500 },
            );
          }

          return Response.json(
            {
              success: true,
              data: {
                name: name || file.name,
                size: file.size,
                type: file.type,
                category: category || "other",
                tags: tags ? tags.split(",").map((t) => t.trim()) : [],
                key: uploadedKey,
              },
            },
            { status: 201 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to upload document",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
