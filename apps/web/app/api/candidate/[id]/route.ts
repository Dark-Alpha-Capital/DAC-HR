import { NextRequest, NextResponse } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { requireAuth } from "@/lib/middleware/auth";
import { deleteCandidateWithAssets } from "@/lib/application/candidate-service";

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

    const deleteResult = await deleteCandidateWithAssets(candidateId);
    if (!deleteResult) {
      console.error(
        `[DELETE /api/candidate/:id] Candidate not found - ID: ${candidateId}`,
      );
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 },
      );
    }

    const { candidate: candidateData, deletedDocuments: candidateDocuments } =
      deleteResult;

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
