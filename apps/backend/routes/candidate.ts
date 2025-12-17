import { Hono } from "hono";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleGenAI,
} from "../lib/ai/models";
import {
  getCandidateWithApplications,
  saveCandidateAiScreening,
  insertAuditLog,
  getCandidateById,
  getDocumentsByCandidateId,
} from "@workspace/db/queries";
import { candidateAiScreeningSchema } from "../lib/schema";
import { authMiddleware } from "middleware/auth";
import { db, eq } from "@workspace/db";
import {
  candidate as candidateSchema,
  application as applicationSchema,
  candidatePosition as candidatePositionSchema,
  candidateDocument as candidateDocumentSchema,
} from "@workspace/db/schema";
import {
  candidateFormSchema,
  candidateDocumentFormSchema,
} from "../lib/candidate-schema";
import { uploadFile, deleteFile } from "../lib/storage";
import { deleteFileSearchStoreDocument } from "../lib/file-search-store";

const candidate = new Hono()
  .get("/", (c) => {
    console.log("[GET /candidate] Health check requested");
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    console.log("[GET /candidate] Health check response:", response);
    return c.json(response);
  })
  .get("/:id", (c) => {
    const candidateId = c.req.param("id");
    console.log(
      `[GET /candidate/:id] Health check requested for candidate ID: ${candidateId}`
    );
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    console.log(
      `[GET /candidate/:id] Health check response for candidate ID ${candidateId}:`,
      response
    );
    return c.json(response);
  })
  /**
   * Create candidate endpoint
   */
  .post("/", authMiddleware, async (c) => {
    const startTime = Date.now();
    try {
      const user = c.get("user");
      if (!user) {
        console.error("[POST /candidate] Unauthorized request - no user found");
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }

      console.log(
        `[POST /candidate] Creating candidate - User: ${user.email} (${user.id})`
      );
      const body = await c.req.json();
      console.log("[POST /candidate] Request body:", {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        positionId: body.positionId,
      });

      const result = candidateFormSchema.safeParse(body);
      if (!result.success) {
        console.error(
          "[POST /candidate] Validation failed:",
          result.error.flatten().fieldErrors
        );
        return c.json(
          { error: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        location,
        source,
        sourceUrl,
        note,
        positionId,
      } = result.data;

      const [newCandidate] = await db
        .insert(candidateSchema)
        .values({
          firstName,
          lastName,
          email,
          phone: phone?.trim() || null,
          location: location?.trim() || null,
          source: source || null,
          sourceUrl: sourceUrl?.trim() || null,
          note: note?.trim() || null,
        })
        .returning();

      if (!newCandidate) {
        console.error(
          "[POST /candidate] Failed to create candidate - no data returned from database"
        );
        return c.json({ error: "Failed to create candidate" }, { status: 500 });
      }

      console.log(
        `[POST /candidate] Candidate created successfully - ID: ${newCandidate.id}, Email: ${newCandidate.email}`
      );

      // Automatically create an application and link to position if a position is selected
      if (positionId && positionId.trim() !== "") {
        console.log(
          `[POST /candidate] Creating application for candidate ${newCandidate.id} and position ${positionId}`
        );
        // Create the application record
        await db.insert(applicationSchema).values({
          candidateId: newCandidate.id,
          positionId,
          status: "pending",
        });

        // Link candidate to position in candidatePosition table for tracking
        await db.insert(candidatePositionSchema).values({
          candidateId: newCandidate.id,
          positionId,
        });
        console.log(
          `[POST /candidate] Application and position link created successfully`
        );
      }

      // Insert audit log asynchronously (don't await to avoid blocking response)
      insertAuditLog({
        userId: user.id,
        action: "create_candidate",
        entityType: "candidate",
        entityId: newCandidate.id,
        details: {
          candidate: {
            id: newCandidate.id,
            firstName: newCandidate.firstName,
            lastName: newCandidate.lastName,
            email: newCandidate.email,
            phone: newCandidate.phone,
            location: newCandidate.location,
            source: newCandidate.source,
            sourceUrl: newCandidate.sourceUrl,
            note: newCandidate.note,
            createdAt: newCandidate.createdAt.toISOString(),
            updatedAt: newCandidate.updatedAt.toISOString(),
          },
          input: {
            firstName,
            lastName,
            email,
            phone: phone?.trim() || null,
            location: location?.trim() || null,
            source: source || null,
            sourceUrl: sourceUrl?.trim() || null,
            note: note?.trim() || null,
            positionId: positionId?.trim() || null,
          },
          createdBy: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            hasPosition: !!positionId && positionId.trim() !== "",
            applicationCreated: !!(positionId && positionId.trim() !== ""),
          },
        },
      }).catch((error) => {
        console.error("Error inserting audit log:", error);
      });

      const duration = Date.now() - startTime;
      console.log(
        `[POST /candidate] Request completed successfully in ${duration}ms - Candidate ID: ${newCandidate.id}`
      );
      return c.json({ success: true, data: newCandidate }, { status: 201 });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[POST /candidate] Error creating candidate after ${duration}ms:`,
        error
      );
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create candidate",
        },
        { status: 500 }
      );
    }
  })
  /**
   * Add document to candidate endpoint
   */
  .post("/:id/documents", authMiddleware, async (c) => {
    const startTime = Date.now();
    try {
      const user = c.get("user");
      if (!user) {
        console.error(
          "[POST /candidate/:id/documents] Unauthorized request - no user found"
        );
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }

      const candidateId = c.req.param("id");
      console.log(
        `[POST /candidate/:id/documents] Adding document to candidate ${candidateId} - User: ${user.email} (${user.id})`
      );
      if (!candidateId || candidateId.trim() === "") {
        console.error("[POST /candidate/:id/documents] Missing candidate ID");
        return c.json({ error: "Candidate ID is required" }, { status: 400 });
      }

      // Parse form data
      const formData = await c.req.formData();
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
        `[POST /candidate/:id/documents] Document details - Name: ${name}, Category: ${category}, Has file: ${!!file}, Has URL: ${!!url}`
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
          `[POST /candidate/:id/documents] File upload - Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
        );
        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
          console.error(
            `[POST /candidate/:id/documents] File size validation failed - Size: ${file.size} bytes, Max: ${maxSize} bytes`
          );
          return c.json(
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
            `[POST /candidate/:id/documents] Video file rejected - Type: ${file.type}`
          );
          return c.json(
            {
              error:
                "Video files are not allowed. Please upload other file types.",
            },
            { status: 400 }
          );
        }

        // Upload file to storage
        console.log(
          `[POST /candidate/:id/documents] Uploading file to storage...`
        );
        const uploadedUrl = await uploadFile(file);
        console.log(
          `[POST /candidate/:id/documents] File uploaded successfully - URL: ${uploadedUrl}`
        );

        if (!uploadedUrl) {
          console.error(
            "[POST /candidate/:id/documents] File upload failed - no URL returned"
          );
          return c.json(
            { error: "Failed to upload file to storage" },
            { status: 500 }
          );
        }

        finalUrl = uploadedUrl;
      } else if (url && url.trim() !== "") {
        // Validate URL format if provided directly
        console.log(
          `[POST /candidate/:id/documents] Using provided URL: ${url}`
        );
        try {
          new URL(url);
          finalUrl = url.trim();
        } catch {
          console.error(
            `[POST /candidate/:id/documents] Invalid URL format: ${url}`
          );
          return c.json({ error: "Invalid URL format" }, { status: 400 });
        }
      } else {
        console.error(
          "[POST /candidate/:id/documents] Neither file nor URL provided"
        );
        return c.json(
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
          "[POST /candidate/:id/documents] Validation failed:",
          validationResult.error.flatten().fieldErrors
        );
        return c.json(
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
            `[POST /candidate/:id/documents] Candidate not found - ID: ${candidateId}`
          );
          return c.json({ error: "Candidate not found" }, { status: 404 });
        }

        if (
          CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME &&
          CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME.trim() !== ""
        ) {
          console.log(
            `[POST /candidate/:id/documents] Uploading to file search store: ${CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME}`
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
              `[POST /candidate/:id/documents] Waiting for file search store indexing to complete...`
            );
            let waitCount = 0;
            while (!operation.done) {
              waitCount++;
              await new Promise((resolve) => setTimeout(resolve, 5000));
              operation = await googleGenAI.operations.get({ operation });
              if (waitCount % 3 === 0) {
                console.log(
                  `[POST /candidate/:id/documents] Still waiting for indexing... (${waitCount * 5}s elapsed)`
                );
              }
            }

            fileSearchDocumentName = operation.response?.documentName || null;

            if (fileSearchDocumentName) {
              console.log(
                `[POST /candidate/:id/documents] File uploaded to search store successfully - Document name: ${fileSearchDocumentName}`
              );
            } else {
              console.warn(
                `[POST /candidate/:id/documents] File search store upload completed but no document name returned`
              );
            }
          } catch (error) {
            console.error(
              `[POST /candidate/:id/documents] Error uploading to file search store:`,
              error
            );
            // Don't fail the entire request if file search store upload fails
            // The document will still be created without file search indexing
          }
        } else {
          console.log(
            `[POST /candidate/:id/documents] Skipping file search store upload - store name not configured`
          );
        }
      }

      // Create the candidate document
      console.log(
        `[POST /candidate/:id/documents] Creating candidate document record in database...`
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
        `[POST /candidate/:id/documents] Candidate document created successfully - Document ID: ${newCandidateDocument?.id}`
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
      }).catch((error) => {
        console.error("Error inserting audit log:", error);
      });

      const duration = Date.now() - startTime;
      console.log(
        `[POST /candidate/:id/documents] Request completed successfully in ${duration}ms - Document ID: ${newCandidateDocument?.id}`
      );
      return c.json(
        { success: true, data: newCandidateDocument },
        { status: 201 }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[POST /candidate/:id/documents] Error creating candidate document after ${duration}ms:`,
        error
      );
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 }
      );
    }
  })
  /**
   * Delete candidate document endpoint
   */
  .delete("/:id/documents/:documentId", authMiddleware, async (c) => {
    const startTime = Date.now();
    try {
      const user = c.get("user");
      if (!user) {
        console.error(
          "[DELETE /candidate/:id/documents/:documentId] Unauthorized request - no user found"
        );
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }

      const candidateId = c.req.param("id");
      const documentId = c.req.param("documentId");
      console.log(
        `[DELETE /candidate/:id/documents/:documentId] Deleting document ${documentId} for candidate ${candidateId} - User: ${user.email} (${user.id})`
      );

      if (!candidateId || candidateId.trim() === "") {
        console.error(
          "[DELETE /candidate/:id/documents/:documentId] Missing candidate ID"
        );
        return c.json({ error: "Candidate ID is required" }, { status: 400 });
      }

      if (!documentId || documentId.trim() === "") {
        console.error(
          "[DELETE /candidate/:id/documents/:documentId] Missing document ID"
        );
        return c.json({ error: "Document ID is required" }, { status: 400 });
      }

      // Get document data before deletion for audit log and cleanup
      const [documentData] = await db
        .select()
        .from(candidateDocumentSchema)
        .where(eq(candidateDocumentSchema.id, documentId))
        .limit(1);

      if (!documentData) {
        console.error(
          `[DELETE /candidate/:id/documents/:documentId] Document not found - Document ID: ${documentId}`
        );
        return c.json({ error: "Document not found" }, { status: 404 });
      }

      // Verify the document belongs to the candidate
      if (documentData.candidateId !== candidateId) {
        console.error(
          `[DELETE /candidate/:id/documents/:documentId] Document ownership mismatch - Document candidate ID: ${documentData.candidateId}, Request candidate ID: ${candidateId}`
        );
        return c.json(
          { error: "Document does not belong to this candidate" },
          { status: 403 }
        );
      }

      console.log(
        `[DELETE /candidate/:id/documents/:documentId] Document found - Name: ${documentData.name}, URL: ${documentData.url}, Has fileSearchDocumentName: ${!!documentData.fileSearchDocumentName}`
      );

      // Delete from database first
      console.log(
        `[DELETE /candidate/:id/documents/:documentId] Deleting document from database...`
      );
      await db
        .delete(candidateDocumentSchema)
        .where(eq(candidateDocumentSchema.id, documentId));
      console.log(
        `[DELETE /candidate/:id/documents/:documentId] Document deleted from database`
      );

      // Delete from Google Cloud Storage (if URL exists)
      if (documentData.url) {
        console.log(
          `[DELETE /candidate/:id/documents/:documentId] Deleting file from GCS: ${documentData.url}`
        );
        try {
          await deleteFile(documentData.url);
          console.log(
            `[DELETE /candidate/:id/documents/:documentId] File deleted from GCS successfully`
          );
        } catch (error) {
          console.error(
            `[DELETE /candidate/:id/documents/:documentId] Error deleting file from GCS:`,
            error
          );
          // Continue even if GCS deletion fails - document is already deleted from DB
        }
      }

      // Delete from FileSearchStore (if fileSearchDocumentName exists)
      if (documentData.fileSearchDocumentName) {
        console.log(
          `[DELETE /candidate/:id/documents/:documentId] Deleting file from FileSearchStore: ${documentData.fileSearchDocumentName}`
        );
        try {
          await deleteFileSearchStoreDocument(
            documentData.fileSearchDocumentName
          );
          console.log(
            `[DELETE /candidate/:id/documents/:documentId] File deleted from FileSearchStore successfully`
          );
        } catch (error) {
          console.error(
            `[DELETE /candidate/:id/documents/:documentId] Error deleting file from FileSearchStore:`,
            error
          );
          // Continue even if FileSearchStore deletion fails - document is already deleted from DB
        }
      }

      // Insert audit log asynchronously
      insertAuditLog({
        userId: user.id,
        action: "delete_candidate_document",
        entityType: "candidate_document",
        entityId: documentId,
        details: {
          candidateDocument: {
            id: documentData.id,
            candidateId: documentData.candidateId,
            name: documentData.name,
            description: documentData.description || "",
            category: documentData.category || "",
            url: documentData.url,
            tags: documentData.tags || [],
            createdAt: documentData.createdAt.toISOString(),
            updatedAt: documentData.updatedAt.toISOString(),
          },
          deletedBy: {
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
        `[DELETE /candidate/:id/documents/:documentId] Request completed successfully in ${duration}ms - Document ID: ${documentId}`
      );
      return c.json({ success: true }, { status: 200 });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[DELETE /candidate/:id/documents/:documentId] Error deleting candidate document after ${duration}ms:`,
        error
      );
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete candidate document",
        },
        { status: 500 }
      );
    }
  })
  /**
   * Delete candidate endpoint
   * Deletes candidate and all related data including documents from GCS and FileSearchStore
   */
  .delete("/:id", authMiddleware, async (c) => {
    const startTime = Date.now();
    try {
      const user = c.get("user");
      if (!user) {
        console.error(
          "[DELETE /candidate/:id] Unauthorized request - no user found"
        );
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }

      const candidateId = c.req.param("id");
      console.log(
        `[DELETE /candidate/:id] Deleting candidate ${candidateId} - User: ${user.email} (${user.id})`
      );

      if (!candidateId || candidateId.trim() === "") {
        console.error("[DELETE /candidate/:id] Missing candidate ID");
        return c.json({ error: "Candidate ID is required" }, { status: 400 });
      }

      // Get candidate data before deletion for audit log
      const candidateData = await getCandidateById(candidateId);

      if (!candidateData) {
        console.error(
          `[DELETE /candidate/:id] Candidate not found - ID: ${candidateId}`
        );
        return c.json({ error: "Candidate not found" }, { status: 404 });
      }

      console.log(
        `[DELETE /candidate/:id] Candidate found - Name: ${candidateData.firstName} ${candidateData.lastName}, Email: ${candidateData.email}`
      );

      // Get all candidate documents before deletion
      const candidateDocuments = await getDocumentsByCandidateId(candidateId);
      console.log(
        `[DELETE /candidate/:id] Found ${candidateDocuments.length} documents to delete`
      );

      // Delete all documents from GCS and FileSearchStore
      console.log(
        `[DELETE /candidate/:id] Starting deletion of ${candidateDocuments.length} documents from storage...`
      );
      const deletionPromises = candidateDocuments.map(async (doc) => {
        const promises: Promise<boolean>[] = [];

        // Delete from Google Cloud Storage (if URL exists)
        if (doc.url) {
          console.log(
            `[DELETE /candidate/:id] Deleting document ${doc.id} from GCS: ${doc.url}`
          );
          promises.push(
            deleteFile(doc.url).catch((error) => {
              console.error(
                `[DELETE /candidate/:id] Error deleting file from GCS for document ${doc.id}:`,
                error
              );
              return false;
            })
          );
        }

        // Delete from FileSearchStore (if fileSearchDocumentName exists)
        if (doc.fileSearchDocumentName) {
          console.log(
            `[DELETE /candidate/:id] Deleting document ${doc.id} from FileSearchStore: ${doc.fileSearchDocumentName}`
          );
          promises.push(
            deleteFileSearchStoreDocument(doc.fileSearchDocumentName).catch(
              (error) => {
                console.error(
                  `[DELETE /candidate/:id] Error deleting file from FileSearchStore for document ${doc.id}:`,
                  error
                );
                return false;
              }
            )
          );
        }

        return Promise.all(promises);
      });

      // Wait for all document deletions to complete (don't fail if some fail)
      await Promise.all(deletionPromises);
      console.log(
        `[DELETE /candidate/:id] Completed deletion of all documents from storage`
      );

      // Delete candidate from database (this will cascade delete all related records)
      console.log(
        `[DELETE /candidate/:id] Deleting candidate from database...`
      );
      await db
        .delete(candidateSchema)
        .where(eq(candidateSchema.id, candidateId));
      console.log(
        `[DELETE /candidate/:id] Candidate deleted from database successfully`
      );

      // Insert audit log asynchronously
      insertAuditLog({
        userId: user.id,
        action: "delete_candidate",
        entityType: "candidate",
        entityId: candidateId,
        details: {
          candidate: {
            id: candidateData.id,
            firstName: candidateData.firstName,
            lastName: candidateData.lastName,
            email: candidateData.email,
            phone: candidateData.phone || null,
            location: candidateData.location || null,
            source: candidateData.source || null,
            sourceUrl: candidateData.sourceUrl || null,
            note: candidateData.note || null,
            createdAt: candidateData.createdAt.toISOString(),
            updatedAt: candidateData.updatedAt.toISOString(),
          },
          deletedDocuments: candidateDocuments.map((doc) => ({
            id: doc.id,
            name: doc.name,
            url: doc.url,
            fileSearchDocumentName: doc.fileSearchDocumentName || null,
          })),
          deletedBy: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            documentsDeleted: candidateDocuments.length,
          },
        },
      }).catch((error) => {
        console.error("Error inserting audit log:", error);
      });

      const duration = Date.now() - startTime;
      console.log(
        `[DELETE /candidate/:id] Request completed successfully in ${duration}ms - Candidate ID: ${candidateId}, Documents deleted: ${candidateDocuments.length}`
      );
      return c.json({ success: true }, { status: 200 });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[DELETE /candidate/:id] Error deleting candidate after ${duration}ms:`,
        error
      );
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete candidate",
        },
        { status: 500 }
      );
    }
  })
  /**
   * AI analysis endpoint
   *
   * - Fetches full candidate record (including applications and positions)
   * - Optionally focuses on a specific position/application (via positionId)
   * - Uses Gemini + File Search over candidate documents
   * - Returns a detailed suitability report
   */
  .post("/:id/ai-analysis", authMiddleware, async (c) => {
    const startTime = Date.now();
    try {
      const user = c.get("user");
      const candidateId = c.req.param("id");
      console.log(
        `[POST /candidate/:id/ai-analysis] Starting AI analysis for candidate ${candidateId} - User: ${user?.email || "unknown"} (${user?.id || "unknown"})`
      );

      if (!candidateId) {
        console.error("[POST /candidate/:id/ai-analysis] Missing candidate ID");
        return c.json({ error: "Candidate ID is required" }, { status: 400 });
      }

      let body: { positionId?: string } = {};
      try {
        body = await c.req.json();
      } catch {
        // Ignore JSON parse errors – treat as no body / no positionId
        console.log(
          "[POST /candidate/:id/ai-analysis] No request body provided, proceeding without positionId"
        );
      }

      const { positionId } = body;
      if (positionId) {
        console.log(
          `[POST /candidate/:id/ai-analysis] Analysis focused on position: ${positionId}`
        );
      }

      // Fetch candidate with all applications & positions
      console.log(
        `[POST /candidate/:id/ai-analysis] Fetching candidate record with applications...`
      );
      const candidateRecord = await getCandidateWithApplications(candidateId);

      if (!candidateRecord) {
        console.error(
          `[POST /candidate/:id/ai-analysis] Candidate not found - ID: ${candidateId}`
        );
        return c.json({ error: "Candidate not found" }, { status: 404 });
      }

      console.log(
        `[POST /candidate/:id/ai-analysis] Candidate found - Name: ${candidateRecord.firstName} ${candidateRecord.lastName}, Applications: ${candidateRecord.applications.length}`
      );

      // Choose the relevant application for analysis
      const targetApplication =
        (positionId &&
          candidateRecord.applications.find(
            (app) => app.position.id === positionId
          )) ||
        candidateRecord.applications[0] ||
        null;

      const targetPosition = targetApplication?.position ?? null;

      if (targetApplication) {
        console.log(
          `[POST /candidate/:id/ai-analysis] Using application ${targetApplication.id} for position: ${targetPosition?.name}`
        );
      } else {
        console.log(
          `[POST /candidate/:id/ai-analysis] No application found, proceeding with general candidate analysis`
        );
      }

      // Build a compact structured context for the model
      console.log(
        `[POST /candidate/:id/ai-analysis] Building structured context for AI model...`
      );
      const structuredContext = {
        candidate: {
          id: candidateRecord.id,
          firstName: candidateRecord.firstName,
          lastName: candidateRecord.lastName,
          email: candidateRecord.email,
          phone: candidateRecord.phone,
          location: candidateRecord.location,
          source: candidateRecord.source,
          sourceUrl: candidateRecord.sourceUrl,
          note: candidateRecord.note,
          createdAt: candidateRecord.createdAt,
          updatedAt: candidateRecord.updatedAt,
        },
        focusApplication: targetApplication
          ? {
              id: targetApplication.id,
              status: targetApplication.status,
              personality: targetApplication.personality,
              createdAt: targetApplication.createdAt,
              updatedAt: targetApplication.updatedAt,
              position: {
                id: targetApplication.position.id,
                name: targetApplication.position.name,
                slug: targetApplication.position.slug,
                description: targetApplication.position.description,
              },
              interviews: (targetApplication.interviews || []).map((iv) => ({
                id: iv.id,
                status: iv.status,
                rating: iv.rating,
                scheduledAt: iv.scheduledAt,
                overallFeedback: iv.overallFeedback,
                roundTemplate: {
                  id: iv.roundTemplate.id,
                  name: iv.roundTemplate.name,
                  description: iv.roundTemplate.description,
                },
              })),
            }
          : null,
      };

      const structuredContextJson = JSON.stringify(structuredContext, null, 2);

      // Simplified prompt for candidate suitability analysis
      console.log(
        `[POST /candidate/:id/ai-analysis] Generating AI analysis prompt...`
      );
      const prompt = `
You are an expert buy-side hedge fund recruiter and people manager for DarkAlpha Capital.
Your task is to evaluate whether the candidate is a strong fit for the specific position,
using BOTH:
- the structured candidate + position data I give you, AND
- the candidate's documents available via the file search tool.

FIRST, use the fileSearch tool to retrieve and read **all** documents for this candidate
from the \`${CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME}\` store. These may include resume,
cover letter, case studies, work samples, interview feedback, and internal notes.

Then, based on everything you know, produce a comprehensive markdown analysis report
covering the candidate's background, skills, experience fit, culture fit, and overall
suitability for the role.

Important guidelines:
- Always ground your reasoning in specific facts from the candidate data and documents.
- If some information is missing, **explicitly say what is missing** instead of guessing.
- Be concise but concrete; avoid generic HR language.

Here is the structured data about the candidate and position (JSON):
\`\`\`json
${structuredContextJson}
\`\`\`

Now perform the full analysis as described above.
      `.trim();

      // Note: Cannot use responseMimeType: "application/json" with tools (fileSearch)
      // So we'll ask the model to return JSON in the prompt and parse it manually
      const enhancedPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON that matches this simple structure:
{
  "verdict": "Strong Hire" | "Hire" | "Neutral / On the Fence" | "Do Not Hire",
  "score": 0-10,
  "explanation": "A clear explanation of your verdict and score (2-4 sentences)",
  "fullAnalysis": "The complete markdown analysis report covering candidate background, skills, experience fit, culture fit, and overall suitability"
}

Return ONLY the JSON object, no markdown formatting, no code blocks, just pure JSON.`;

      console.log(
        `[POST /candidate/:id/ai-analysis] Calling Gemini API for analysis...`
      );
      const aiStartTime = Date.now();
      const response = await googleGenAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: enhancedPrompt }],
          },
        ],
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME],
                metadataFilter: `candidate_id="${candidateId}"`,
              },
            },
          ],
        },
      });
      const aiDuration = Date.now() - aiStartTime;
      console.log(
        `[POST /candidate/:id/ai-analysis] Gemini API response received in ${aiDuration}ms`
      );

      // Extract and parse JSON from response
      console.log(`[POST /candidate/:id/ai-analysis] Parsing AI response...`);
      let responseText = response.text || "";

      // Remove markdown code blocks if present
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON if wrapped in text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }

      const parsedResponse = JSON.parse(responseText);
      const candidateAiScreening =
        candidateAiScreeningSchema.parse(parsedResponse);

      console.log(
        `[POST /candidate/:id/ai-analysis] AI analysis parsed successfully - Verdict: ${candidateAiScreening.verdict}, Score: ${candidateAiScreening.score}`
      );

      // Save the analysis to the database
      console.log(
        `[POST /candidate/:id/ai-analysis] Saving AI screening to database...`
      );
      const savedScreening = await saveCandidateAiScreening({
        candidateId,
        positionId: targetApplication?.position.id || null,
        applicationId: targetApplication?.id || null,
        analysis: candidateAiScreening.fullAnalysis,
        model: "gemini-2.5-flash",
        structuredData: candidateAiScreening,
      });

      if (!savedScreening) {
        console.warn(
          `[POST /candidate/:id/ai-analysis] Failed to save AI screening to database, but analysis was generated successfully`
        );
      } else {
        console.log(
          `[POST /candidate/:id/ai-analysis] AI screening saved to database - Screening ID: ${savedScreening.id}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(
        `[POST /candidate/:id/ai-analysis] Request completed successfully in ${duration}ms - Candidate ID: ${candidateId}, Screening ID: ${savedScreening?.id || "none"}`
      );
      return c.json(
        {
          analysis: candidateAiScreening.fullAnalysis,
          screeningId: savedScreening?.id || null,
          structuredData: candidateAiScreening,
        },
        { status: 200 }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[POST /candidate/:id/ai-analysis] Error during candidate AI analysis after ${duration}ms:`,
        error
      );
      return c.json(
        {
          error: "Failed to analyze candidate",
        },
        { status: 500 }
      );
    }
  });

export default candidate;
