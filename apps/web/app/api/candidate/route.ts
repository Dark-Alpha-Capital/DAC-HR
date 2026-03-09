import { NextRequest, NextResponse } from "next/server";
import { candidateFormSchema } from "@/lib/schemas/candidate-form-schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { requireAuth } from "@/lib/middleware/auth";
import { createCandidateWithOptionalPosition } from "@/lib/application/candidate-service";

const redactEmail = (email: string | null | undefined): string => {
  if (!email) return "unknown";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) return "***";
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domainPart}`;
};

/**
 * Create candidate endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }
    const { user } = authResult;

    console.info("[POST /api/candidate] create:start", { userId: user.id });
    const body = await request.json();
    console.info("[POST /api/candidate] request:received", {
      userId: user.id,
      candidateEmailRedacted: redactEmail(body?.email),
      hasPositionId: Boolean(body?.positionId),
    });

    const result = candidateFormSchema.safeParse(body);
    if (!result.success) {
      console.warn("[POST /api/candidate] validation:failed", {
        userId: user.id,
        fieldNames: Object.keys(result.error.flatten().fieldErrors),
      });
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 },
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

    const { candidate: newCandidate, hasPosition, normalizedPositionId } =
      await createCandidateWithOptionalPosition({
        firstName,
        lastName,
        email,
        phone,
        location,
        source,
        sourceUrl,
        note,
        positionId,
      });

    if (hasPosition) {
      console.info("[POST /api/candidate] application:create:success", {
        candidateId: newCandidate.id,
        positionId: normalizedPositionId,
      });
    }

    console.info("[POST /api/candidate] create:success", {
      candidateId: newCandidate.id,
      userId: user.id,
    });

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
          positionId: normalizedPositionId,
        },
        createdBy: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          hasPosition,
          applicationCreated: hasPosition,
        },
      },
    }).catch((error) => {
      console.error("Error inserting audit log:", error);
    });

    const duration = Date.now() - startTime;
    console.info("[POST /api/candidate] request:completed", {
      candidateId: newCandidate.id,
      durationMs: duration,
    });
    return NextResponse.json(
      { success: true, data: newCandidate },
      { status: 201 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/candidate] Error creating candidate after ${duration}ms:`,
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create candidate",
      },
      { status: 500 },
    );
  }
}
