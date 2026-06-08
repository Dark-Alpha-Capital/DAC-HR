import { after, NextRequest, NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { db } from "@workspace/db";
import {
  createNextcloudClient,
  deleteFile as deleteNextcloudFile,
  uploadFile as uploadToNextcloud,
  type NextcloudConfig,
} from "@workspace/nextcloud";
import { candidateDocument as candidateDocumentSchema } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { candidateDocumentFormSchema } from "@/lib/schemas/candidate-document-form-schema";
import { CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME } from "@/lib/ai/models";
import { requireAuth } from "@/lib/middleware/auth";
import { uploadCandidateFileToSearchStore } from "@/lib/application/candidate-document-service";

/**
 * Get candidate documents endpoint
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: candidateId } = await params;

    if (!candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 },
      );
    }

    const documents = await getDocumentsByCandidateId(candidateId);

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate documents", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

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

const getNextcloudConfig = (): NextcloudConfig => {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!url || !user || !password) {
    throw new Error(
      "Nextcloud configuration is missing. Please set NEXTCLOUD_URL, NEXTCLOUD_USER, and NEXTCLOUD_PASSWORD environment variables.",
    );
  }

  return { url, user, password };
};

/**
 * Add document to candidate endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();

  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { id: candidateId } = await params;

    if (!candidateId || candidateId.trim() === "") {
      return NextResponse.json(
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
    const url = formData.get("url") as string | null;
    const tagsInput = formData.get("tags") as string | null;

    let tags: string[] = [];
    if (tagsInput) {
      try {
        tags = JSON.parse(tagsInput);
      } catch {
        tags = tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
    }

    let finalUrl: string;
    let fileSearchDocumentName: string | null = null;

    if (file) {
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 500MB limit" },
          { status: 400 },
        );
      }

      if (VIDEO_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              "Video files are not allowed. Please upload other file types.",
          },
          { status: 400 },
        );
      }

      const candidateForMetadata = await getCandidateById(candidateId);
      if (!candidateForMetadata) {
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 },
        );
      }

      if (
        !CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME ||
        CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME.trim() === ""
      ) {
        return NextResponse.json(
          { error: "Candidate document search store is not configured" },
          { status: 500 },
        );
      }

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
        return NextResponse.json(
          { error: "Failed to upload file to Nextcloud" },
          { status: 500 },
        );
      }
      finalUrl = nextcloudUploadResult.downloadUrl;

      try {
        fileSearchDocumentName = await uploadCandidateFileToSearchStore({
          file: file as Blob,
          fileSearchStoreName: CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
          candidateId,
          candidate: {
            firstName: candidateForMetadata.firstName,
            lastName: candidateForMetadata.lastName,
            email: candidateForMetadata.email,
            location: candidateForMetadata.location,
            source: candidateForMetadata.source,
            sourceUrl: candidateForMetadata.sourceUrl,
          },
          displayName: name,
        });

        if (!fileSearchDocumentName) {
          throw new Error("File search index response missing document name");
        }
      } catch (error) {
        const cleanupResult = await deleteNextcloudFile({
          client: nextcloudClient,
          filePathOrUrl: finalUrl,
        });

        if (!cleanupResult.success) {
          console.error(
            "Failed to delete Nextcloud file after FileSearch indexing failure",
            {
              candidateId,
              url: finalUrl,
            },
          );
        }

        console.error("FileSearch indexing failed", error);
        return NextResponse.json(
          { error: "Failed to index document for candidate search" },
          { status: 500 },
        );
      }
    } else if (url && url.trim() !== "") {
      try {
        new URL(url);
        finalUrl = url.trim();
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Please either upload a file or provide a document URL" },
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
      return NextResponse.json(
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
        description:
          validatedData.description && validatedData.description.trim() !== ""
            ? validatedData.description
            : null,
        category: validatedData.category || "other",
        url: validatedData.url,
        tags:
          validatedData.tags && validatedData.tags.length > 0
            ? validatedData.tags
            : null,
        fileSearchDocumentName,
      })
      .returning();

    updateTag(`candidate-documents-${candidateId}`);

    after(async () => {
      try {
        await insertAuditLog({
          userId: user.id,
          action: "create_candidate_document",
          entityType: "candidate_document",
          entityId: newCandidateDocument?.id || "",
          details: {
            candidateDocument: {
              id: newCandidateDocument?.id || "",
              candidateId: newCandidateDocument?.candidateId || "",
              name: newCandidateDocument?.name || "",
              description: newCandidateDocument?.description || "",
              category: newCandidateDocument?.category || "",
              url: newCandidateDocument?.url || "",
              tags: newCandidateDocument?.tags || [],
              createdAt: newCandidateDocument?.createdAt.toISOString() || "",
              updatedAt: newCandidateDocument?.updatedAt.toISOString() || "",
            },
            input: {
              candidateId,
              name: validatedData.name,
              description:
                validatedData.description &&
                validatedData.description.trim() !== ""
                  ? validatedData.description
                  : null,
              category: validatedData.category || "other",
              url: validatedData.url,
              tags:
                validatedData.tags && validatedData.tags.length > 0
                  ? validatedData.tags
                  : null,
            },
            createdBy: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Error inserting audit log:", error);
      }
    });

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/candidate/:id/documents] ✅ Request completed successfully at ${new Date().toISOString()} - Duration: ${duration}ms - Document ID: ${newCandidateDocument?.id}`,
    );

    return NextResponse.json(
      { success: true, data: newCandidateDocument },
      { status: 201 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(
      `[POST /api/candidate/:id/documents] ❌ Error creating candidate document at ${new Date().toISOString()} - Duration: ${duration}ms:`,
      {
        error,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
    );

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
