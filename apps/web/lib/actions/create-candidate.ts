"use server";

import { db } from "@workspace/db";
import {
  candidate,
  application,
  candidatePosition,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/queries";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";

export const createCandidate = async (data: CandidateFormSchema) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = candidateFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
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

  try {
    const [newCandidate] = await db
      .insert(candidate)
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
      return { error: "Failed to create candidate" };
    }

    // Automatically create an application and link to position if a position is selected
    if (positionId && positionId.trim() !== "") {
      // Create the application record
      await db.insert(application).values({
        candidateId: newCandidate.id,
        positionId,
        status: "ai_screening",
      });

      // Link candidate to position in candidatePosition table for tracking
      await db.insert(candidatePosition).values({
        candidateId: newCandidate.id,
        positionId,
      });
    }

    updateTag("candidates");
    updateTag(`candidate-applications-${newCandidate.id}`);
    revalidatePath("/candidates");

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "create_candidate",
        entityType: "candidate",
        entityId: newCandidate.id,
        details: {
          // Candidate information
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
          // Input data provided
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
          // User information (who created the candidate)
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          // Metadata
          metadata: {
            timestamp: new Date().toISOString(),
            hasPosition: !!positionId && positionId.trim() !== "",
            applicationCreated: !!(positionId && positionId.trim() !== ""),
          },
        },
      });
    });

    return { success: true, data: newCandidate };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create candidate" };
  }
};
