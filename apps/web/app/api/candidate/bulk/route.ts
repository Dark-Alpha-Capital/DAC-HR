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
 * Bulk delete candidates endpoint
 *
 * - Accepts an array of candidate IDs in the request body
 * - Deletes each candidate and their associated documents
 * - Returns results with success/failure counts
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }
    const { user } = authResult;

    let body: { candidateIds: string[] };
    try {
      body = await request.json();
    } catch (error) {
      console.error(
        "[DELETE /api/candidate/bulk] Invalid request body:",
        error,
      );
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with candidateIds array.",
        },
        { status: 400 },
      );
    }

    const { candidateIds } = body;

    if (
      !candidateIds ||
      !Array.isArray(candidateIds) ||
      candidateIds.length === 0
    ) {
      console.error(
        "[DELETE /api/candidate/bulk] Missing or invalid candidateIds",
      );
      return NextResponse.json(
        { error: "candidateIds array is required and must not be empty" },
        { status: 400 },
      );
    }

    console.log(
      `[DELETE /api/candidate/bulk] Bulk deleting ${candidateIds.length} candidates - User: ${user.email} (${user.id})`,
    );

    const results: Array<{
      id: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process each candidate deletion
    for (const candidateId of candidateIds) {
      try {
        if (!candidateId || candidateId.trim() === "") {
          results.push({
            id: candidateId,
            success: false,
            error: "Invalid candidate ID",
          });
          continue;
        }

        // Get candidate data before deletion for audit log
        const candidateData = await getCandidateById(candidateId);

        if (!candidateData) {
          console.error(
            `[DELETE /api/candidate/bulk] Candidate not found - ID: ${candidateId}`,
          );
          results.push({
            id: candidateId,
            success: false,
            error: "Candidate not found",
          });
          continue;
        }

        // Get all candidate documents before deletion
        const candidateDocuments = await getDocumentsByCandidateId(candidateId);

        // Delete all documents from GCS and FileSearchStore
        const deletionPromises = candidateDocuments.map(async (doc) => {
          const promises: Promise<boolean>[] = [];

          // Delete from Google Cloud Storage (if URL exists)
          if (doc.url) {
            promises.push(
              deleteFile(doc.url).catch((error) => {
                console.error(
                  `[DELETE /api/candidate/bulk] Error deleting file from GCS for document ${doc.id}:`,
                  error,
                );
                return false;
              }),
            );
          }

          // Delete from FileSearchStore (if fileSearchDocumentName exists)
          if (doc.fileSearchDocumentName) {
            promises.push(
              deleteFileSearchStoreDocument(doc.fileSearchDocumentName).catch(
                (error) => {
                  console.error(
                    `[DELETE /api/candidate/bulk] Error deleting file from FileSearchStore for document ${doc.id}:`,
                    error,
                  );
                  return false;
                },
              ),
            );
          }

          return Promise.all(promises);
        });

        // Wait for all document deletions to complete
        await Promise.all(deletionPromises);

        // Delete candidate from database (this will cascade delete all related records)
        await db
          .delete(candidateSchema)
          .where(eq(candidateSchema.id, candidateId));

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
              bulkDelete: true,
            },
          },
        }).catch((error) => {
          console.error("Error inserting audit log:", error);
        });

        results.push({ id: candidateId, success: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete candidate";
        console.error(
          `[DELETE /api/candidate/bulk] Error deleting candidate ${candidateId}:`,
          error,
        );
        results.push({
          id: candidateId,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    const duration = Date.now() - startTime;
    console.log(
      `[DELETE /api/candidate/bulk] Request completed in ${duration}ms - Success: ${successCount}, Failed: ${failedCount}`,
    );

    return NextResponse.json(
      {
        success: failedCount === 0,
        deleted: successCount,
        failed: failedCount,
        results,
      },
      { status: failedCount === 0 ? 200 : 207 }, // 207 Multi-Status for partial success
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[DELETE /api/candidate/bulk] Error processing bulk delete after ${duration}ms:`,
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process bulk delete",
      },
      { status: 500 },
    );
  }
}
