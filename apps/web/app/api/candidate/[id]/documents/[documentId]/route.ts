import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@workspace/db";
import { candidateDocument as candidateDocumentSchema } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/queries";
import { deleteFile } from "@/lib/storage";
import { deleteFileSearchStoreDocument } from "@/lib/file-search-store";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * Delete candidate document endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }
    const { user } = authResult;

    const { id: candidateId, documentId } = await params;
    console.log(
      `[DELETE /api/candidate/:id/documents/:documentId] Deleting document ${documentId} for candidate ${candidateId} - User: ${user.email} (${user.id})`,
    );

    if (!candidateId || candidateId.trim() === "") {
      console.error(
        "[DELETE /api/candidate/:id/documents/:documentId] Missing candidate ID",
      );
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 },
      );
    }

    if (!documentId || documentId.trim() === "") {
      console.error(
        "[DELETE /api/candidate/:id/documents/:documentId] Missing document ID",
      );
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // Get document data before deletion for audit log and cleanup
    const [documentData] = await db
      .select()
      .from(candidateDocumentSchema)
      .where(eq(candidateDocumentSchema.id, documentId))
      .limit(1);

    if (!documentData) {
      console.error(
        `[DELETE /api/candidate/:id/documents/:documentId] Document not found - Document ID: ${documentId}`,
      );
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Verify the document belongs to the candidate
    if (documentData.candidateId !== candidateId) {
      console.error(
        `[DELETE /api/candidate/:id/documents/:documentId] Document ownership mismatch - Document candidate ID: ${documentData.candidateId}, Request candidate ID: ${candidateId}`,
      );
      return NextResponse.json(
        { error: "Document does not belong to this candidate" },
        { status: 403 },
      );
    }

    console.log(
      `[DELETE /api/candidate/:id/documents/:documentId] Document found - Name: ${documentData.name}, URL: ${documentData.url}, Has fileSearchDocumentName: ${!!documentData.fileSearchDocumentName}`,
    );

    // Delete from database first
    console.log(
      `[DELETE /api/candidate/:id/documents/:documentId] Deleting document from database...`,
    );
    await db
      .delete(candidateDocumentSchema)
      .where(eq(candidateDocumentSchema.id, documentId));
    console.log(
      `[DELETE /api/candidate/:id/documents/:documentId] Document deleted from database`,
    );

    // Delete from Google Cloud Storage (if URL exists)
    if (documentData.url) {
      console.log(
        `[DELETE /api/candidate/:id/documents/:documentId] Deleting file from GCS: ${documentData.url}`,
      );
      try {
        await deleteFile(documentData.url);
        console.log(
          `[DELETE /api/candidate/:id/documents/:documentId] File deleted from GCS successfully`,
        );
      } catch (error) {
        console.error(
          `[DELETE /api/candidate/:id/documents/:documentId] Error deleting file from GCS:`,
          error,
        );
        // Continue even if GCS deletion fails - document is already deleted from DB
      }
    }

    // Delete from FileSearchStore (if fileSearchDocumentName exists)
    if (documentData.fileSearchDocumentName) {
      console.log(
        `[DELETE /api/candidate/:id/documents/:documentId] Deleting file from FileSearchStore: ${documentData.fileSearchDocumentName}`,
      );
      try {
        await deleteFileSearchStoreDocument(
          documentData.fileSearchDocumentName,
        );
        console.log(
          `[DELETE /api/candidate/:id/documents/:documentId] File deleted from FileSearchStore successfully`,
        );
      } catch (error) {
        console.error(
          `[DELETE /api/candidate/:id/documents/:documentId] Error deleting file from FileSearchStore:`,
          error,
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
      `[DELETE /api/candidate/:id/documents/:documentId] Request completed successfully in ${duration}ms - Document ID: ${documentId}`,
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[DELETE /api/candidate/:id/documents/:documentId] Error deleting candidate document after ${duration}ms:`,
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete candidate document",
      },
      { status: 500 },
    );
  }
}
