import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@workspace/db";
import { candidate as candidateSchema } from "@workspace/db/schema";
import {
  getCandidateById,
  getDocumentsByCandidateId,
  insertAuditLog,
} from "@workspace/db/queries";
import { deleteFile } from "@/lib/storage";
import { deleteFileSearchStoreDocument } from "@/lib/file-search-store";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * Delete candidate endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      `[DELETE /api/candidate/:id] Deleting candidate ${candidateId} - User: ${user.email} (${user.id})`,
    );

    if (!candidateId || candidateId.trim() === "") {
      console.error("[DELETE /api/candidate/:id] Missing candidate ID");
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 },
      );
    }

    // Get candidate data before deletion for audit log
    const candidateData = await getCandidateById(candidateId);

    if (!candidateData) {
      console.error(
        `[DELETE /api/candidate/:id] Candidate not found - ID: ${candidateId}`,
      );
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 },
      );
    }

    console.log(
      `[DELETE /api/candidate/:id] Candidate found - Name: ${candidateData.firstName} ${candidateData.lastName}, Email: ${candidateData.email}`,
    );

    // Get all candidate documents before deletion
    const candidateDocuments = await getDocumentsByCandidateId(candidateId);
    console.log(
      `[DELETE /api/candidate/:id] Found ${candidateDocuments.length} documents to delete`,
    );

    // Delete all documents from GCS and FileSearchStore
    console.log(
      `[DELETE /api/candidate/:id] Starting deletion of ${candidateDocuments.length} documents from storage...`,
    );
    const deletionPromises = candidateDocuments.map(async (doc) => {
      const promises: Promise<boolean>[] = [];

      // Delete from Google Cloud Storage (if URL exists)
      if (doc.url) {
        console.log(
          `[DELETE /api/candidate/:id] Deleting document ${doc.id} from GCS: ${doc.url}`,
        );
        promises.push(
          deleteFile(doc.url).catch((error) => {
            console.error(
              `[DELETE /api/candidate/:id] Error deleting file from GCS for document ${doc.id}:`,
              error,
            );
            return false;
          }),
        );
      }

      // Delete from FileSearchStore (if fileSearchDocumentName exists)
      if (doc.fileSearchDocumentName) {
        console.log(
          `[DELETE /api/candidate/:id] Deleting document ${doc.id} from FileSearchStore: ${doc.fileSearchDocumentName}`,
        );
        promises.push(
          deleteFileSearchStoreDocument(doc.fileSearchDocumentName).catch(
            (error) => {
              console.error(
                `[DELETE /api/candidate/:id] Error deleting file from FileSearchStore for document ${doc.id}:`,
                error,
              );
              return false;
            },
          ),
        );
      }

      return Promise.all(promises);
    });

    // Wait for all document deletions to complete (don't fail if some fail)
    await Promise.all(deletionPromises);
    console.log(
      `[DELETE /api/candidate/:id] Completed deletion of all documents from storage`,
    );

    // Delete candidate from database (this will cascade delete all related records)
    console.log(
      `[DELETE /api/candidate/:id] Deleting candidate from database...`,
    );
    await db.delete(candidateSchema).where(eq(candidateSchema.id, candidateId));
    console.log(
      `[DELETE /api/candidate/:id] Candidate deleted from database successfully`,
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
      `[DELETE /api/candidate/:id] Request completed successfully in ${duration}ms - Candidate ID: ${candidateId}, Documents deleted: ${candidateDocuments.length}`,
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[DELETE /api/candidate/:id] Error deleting candidate after ${duration}ms:`,
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete candidate",
      },
      { status: 500 },
    );
  }
}
