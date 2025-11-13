"use server";

import { db } from "@workspace/db";
import { candidate, application } from "@workspace/db/schema";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";

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

  const { firstName, lastName, email, phone, location, note, positionId, source } =
    result.data;

  try {
    const [newCandidate] = await db
      .insert(candidate)
      .values({
        firstName,
        lastName,
        email,
        phone,
        location,
        note,
        source
      })
      .returning();

    if (!newCandidate) {
      return { error: "Failed to create candidate" };
    }

    // Automatically create an application if a position is selected
    if (positionId && positionId.trim() !== "") {
      await db.insert(application).values({
        candidateId: newCandidate.id,
        positionId,
        status: "pending",
        currentStage: 1,
      });
    }

    revalidatePath("/candidates");

    return { success: true, data: newCandidate };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create candidate" };
  }
};
