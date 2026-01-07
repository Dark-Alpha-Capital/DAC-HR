import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@workspace/db";
import { candidateDocument as candidateDocumentSchema } from "@workspace/db/schema";
import {
  getCandidateById,
  getDocumentsByCandidateId,
  insertAuditLog,
} from "@workspace/db/queries";
import { candidateDocumentFormSchema } from "@/lib/schemas/candidate-document-form-schema";
import { uploadFile } from "@/lib/storage";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleGenAI,
} from "@/lib/ai/models";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * Get candidate documents endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }

    const { id: candidateId } = await params;

    if (!candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
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
      { status: 500 }
    );
  }
}

/**
 * Add document to candidate endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }
    const { user } = authResult;

    const { id: candidateId } = await params;
    console.log(
      `[POST /api/candidate/:id/documents] Adding document to candidate ${candidateId} - User: ${user.email} (${user.id})`
    );
    if (!candidateId || candidateId.trim() === "") {
      console.error("[POST /api/candidate/:id/documents] Missing candidate ID");
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Parse form data
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

    console.log(
      `[POST /api/candidate/:id/documents] Document details - Name: ${name}, Category: ${category}, Has file: ${!!file}, Has URL: ${!!url}`
    );

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
      console.log(
        `[POST /api/candidate/:id/documents] File upload - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
      );
      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        console.error(
          `[POST /api/candidate/:id/documents] File size validation failed - Size: ${file.size} bytes, Max: ${maxSize} bytes`
        );
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
        console.error(
          `[POST /api/candidate/:id/documents] Video file rejected - Type: ${file.type}`
        );
        return NextResponse.json(
          {
            error:
              "Video files are not allowed. Please upload other file types.",
          },
          { status: 400 }
        );
      }

      // Upload file to storage
      console.log(
        `[POST /api/candidate/:id/documents] Uploading file to storage...`
      );
      const uploadedUrl = await uploadFile(file);
      console.log(
        `[POST /api/candidate/:id/documents] File uploaded successfully - URL: ${uploadedUrl}`
      );

      if (!uploadedUrl) {
        console.error(
          "[POST /api/candidate/:id/documents] File upload failed - no URL returned"
        );
        return NextResponse.json(
          { error: "Failed to upload file to storage" },
          { status: 500 }
        );
      }

      finalUrl = uploadedUrl;
    } else if (url && url.trim() !== "") {
      // Validate URL format if provided directly
      console.log(
        `[POST /api/candidate/:id/documents] Using provided URL: ${url}`
      );
      try {
        new URL(url);
        finalUrl = url.trim();
      } catch {
        console.error(
          `[POST /api/candidate/:id/documents] Invalid URL format: ${url}`
        );
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    } else {
      console.error(
        "[POST /api/candidate/:id/documents] Neither file nor URL provided"
      );
      return NextResponse.json(
        { error: "Please either upload a file or provide a document URL" },
        { status: 400 }
      );
    }

    // Validate form data
    const formDataToValidate = {
      name: name || "",
      description: description || "",
      category: category || "other",
      url: finalUrl,
      tags: tags,
    };

    const validationResult =
      candidateDocumentFormSchema.safeParse(formDataToValidate);

    if (!validationResult.success) {
      console.error(
        "[POST /api/candidate/:id/documents] Validation failed:",
        validationResult.error.flatten().fieldErrors
      );
      return NextResponse.json(
        { error: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Only upload to file search store if a file is provided
    let fileSearchDocumentName: string | null = null;

    if (file) {
      // Fetch candidate details for richer metadata
      const candidateForMetadata = await getCandidateById(candidateId);

      if (!candidateForMetadata) {
        console.error(
          `[POST /api/candidate/:id/documents] Candidate not found - ID: ${candidateId}`
        );
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      if (
        CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME &&
        CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME.trim() !== ""
      ) {
        console.log(
          `[POST /api/candidate/:id/documents] Uploading to file search store: ${CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME}`
        );
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
              file: file as Blob,
              fileSearchStoreName: CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
              config: {
                displayName: name,
                customMetadata,
              },
            });

          // Wait for indexing to complete (critical step)
          console.log(
            `[POST /api/candidate/:id/documents] Waiting for file search store indexing to complete...`
          );
          let waitCount = 0;
          while (!operation.done) {
            waitCount++;
            await new Promise((resolve) => setTimeout(resolve, 5000));
            operation = await googleGenAI.operations.get({ operation });
            if (waitCount % 3 === 0) {
              console.log(
                `[POST /api/candidate/:id/documents] Still waiting for indexing... (${waitCount * 5}s elapsed)`
              );
            }
          }

          fileSearchDocumentName = operation.response?.documentName || null;

          if (fileSearchDocumentName) {
            console.log(
              `[POST /api/candidate/:id/documents] File uploaded to search store successfully - Document name: ${fileSearchDocumentName}`
            );
          } else {
            console.warn(
              `[POST /api/candidate/:id/documents] File search store upload completed but no document name returned`
            );
          }
        } catch (error) {
          console.error(
            `[POST /api/candidate/:id/documents] Error uploading to file search store:`,
            error
          );
          // Don't fail the entire request if file search store upload fails
          // The document will still be created without file search indexing
        }
      } else {
        console.log(
          `[POST /api/candidate/:id/documents] Skipping file search store upload - store name not configured`
        );
      }
    }

    // Create the candidate document
    console.log(
      `[POST /api/candidate/:id/documents] Creating candidate document record in database...`
    );
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
        fileSearchDocumentName: fileSearchDocumentName || null,
      })
      .returning();

    console.log(
      `[POST /api/candidate/:id/documents] Candidate document created successfully - Document ID: ${newCandidateDocument?.id}`
    );

    // Insert audit log asynchronously
    insertAuditLog({
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
            validatedData.description && validatedData.description.trim() !== ""
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
    }).catch((error) => {
      console.error("Error inserting audit log:", error);
    });

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/candidate/:id/documents] Request completed successfully in ${duration}ms - Document ID: ${newCandidateDocument?.id}`
    );
    return NextResponse.json(
      { success: true, data: newCandidateDocument },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/candidate/:id/documents] Error creating candidate document after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
