import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog, getCandidateById } from "@workspace/db/queries";
import { db } from "@workspace/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  candidateDocumentFormSchema,
  CandidateDocumentFormSchema,
} from "@/lib/schemas/candidate-document-form-schema";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleGenAI,
} from "@/lib/ai/models";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as
      | "resume"
      | "cover-letter"
      | "portfolio"
      | "other";
    const url = formData.get("url") as string | null;
    const tagsInput = formData.get("tags") as string | null;

    // Validate candidateId
    if (!candidateId || candidateId.trim() === "") {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsInput) {
      try {
        // Try parsing as JSON first
        tags = JSON.parse(tagsInput);
      } catch {
        // If not JSON, treat as comma-separated string
        tags = tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
    }

    // Determine final URL - either from file upload or provided URL
    let finalUrl: string;

    if (file) {
      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 500MB limit" },
          { status: 400 }
        );
      }

      // Block video file types
      const videoTypes = [
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

      if (videoTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              "Video files are not allowed. Please upload other file types.",
          },
          { status: 400 }
        );
      }

      // Upload file to storage
      const uploadedUrl = await uploadFile(file);

      if (!uploadedUrl) {
        return NextResponse.json(
          { error: "Failed to upload file to storage" },
          { status: 500 }
        );
      }

      finalUrl = uploadedUrl;
    } else if (url && url.trim() !== "") {
      // Validate URL format if provided directly
      try {
        new URL(url);
        finalUrl = url.trim();
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Please either upload a file or provide a document URL" },
        { status: 400 }
      );
    }

    // Validate form data
    const formDataToValidate: CandidateDocumentFormSchema = {
      name: name || "",
      description: description || "",
      category: category || "other",
      url: finalUrl,
      tags: tags,
    };

    const validationResult =
      candidateDocumentFormSchema.safeParse(formDataToValidate);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Only upload to file search store if a file is provided
    let fileSearchDocumentName: string | null = null;

    if (file) {
      // Fetch candidate details for richer metadata (non-blocking if it fails)
      let candidateForMetadata = await getCandidateById(candidateId);

      if (!candidateForMetadata) {
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      if (
        CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME &&
        CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME.trim() !== ""
      ) {
        try {
          const customMetadata: Array<{
            key: string;
            stringValue?: string;
          }> = [{ key: "candidate_id", stringValue: String(candidateId) }];

          if (candidateForMetadata) {
            const fullName = `${candidateForMetadata.firstName} ${candidateForMetadata.lastName}`;

            customMetadata.push(
              { key: "candidate_full_name", stringValue: fullName },
              {
                key: "candidate_email",
                stringValue: candidateForMetadata.email,
              }
            );

            if (candidateForMetadata.location) {
              customMetadata.push({
                key: "candidate_location",
                stringValue: candidateForMetadata.location,
              });
            }

            if (candidateForMetadata.source) {
              customMetadata.push({
                key: "candidate_source",
                stringValue: candidateForMetadata.source,
              });
            }

            if (candidateForMetadata.sourceUrl) {
              customMetadata.push({
                key: "candidate_source_url",
                stringValue: candidateForMetadata.sourceUrl,
              });
            }
          }

          let operation =
            await googleGenAI.fileSearchStores.uploadToFileSearchStore({
              file: file as Blob, // File object from FormData
              fileSearchStoreName: CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
              config: {
                displayName: name,
                customMetadata,
              },
            });

          // Wait for indexing to complete (critical step)
          while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            operation = await googleGenAI.operations.get({ operation });
          }

          fileSearchDocumentName = operation.response?.documentName || null;

          if (fileSearchDocumentName) {
            console.log(
              "File uploaded to search store:",
              fileSearchDocumentName
            );
          } else {
            console.warn(
              "File search store upload completed but no document name returned"
            );
          }
        } catch (error) {
          console.error("Error uploading to file search store:", error);
          // Don't fail the entire request if file search store upload fails
          // The document will still be created without file search indexing
        }
      }
    }

    // Create the candidate document
    const [newCandidateDocument] = await db
      .insert(candidateDocument)
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
        fileSearchDocumentName: fileSearchDocumentName || null,
      })
      .returning();

    revalidateTag(`candidate-documents-${candidateId}`, "max");
    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json(
      { success: true, data: newCandidateDocument },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating candidate document:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
