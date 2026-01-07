import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@workspace/db";
import {
  candidate as candidateSchema,
  application as applicationSchema,
  candidatePosition as candidatePositionSchema,
} from "@workspace/db/schema";
import { candidateFormSchema } from "@/lib/schemas/candidate-form-schema";
import { insertAuditLog } from "@workspace/db/queries";
import { requireAuth } from "@/lib/middleware/auth";

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

    console.log(
      `[POST /api/candidate] Creating candidate - User: ${user.email} (${user.id})`
    );
    const body = await request.json();
    console.log("[POST /api/candidate] Request body:", {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      positionId: body.positionId,
    });

    const result = candidateFormSchema.safeParse(body);
    if (!result.success) {
      console.error(
        "[POST /api/candidate] Validation failed:",
        result.error.flatten().fieldErrors
      );
      return NextResponse.json(
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
        "[POST /api/candidate] Failed to create candidate - no data returned from database"
      );
      return NextResponse.json(
        { error: "Failed to create candidate" },
        { status: 500 }
      );
    }

    console.log(
      `[POST /api/candidate] Candidate created successfully - ID: ${newCandidate.id}, Email: ${newCandidate.email}`
    );

    // Automatically create an application and link to position if a position is selected
    if (positionId && positionId.trim() !== "") {
      console.log(
        `[POST /api/candidate] Creating application for candidate ${newCandidate.id} and position ${positionId}`
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
        `[POST /api/candidate] Application and position link created successfully`
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
      `[POST /api/candidate] Request completed successfully in ${duration}ms - Candidate ID: ${newCandidate.id}`
    );
    return NextResponse.json(
      { success: true, data: newCandidate },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/candidate] Error creating candidate after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create candidate",
      },
      { status: 500 }
    );
  }
}
