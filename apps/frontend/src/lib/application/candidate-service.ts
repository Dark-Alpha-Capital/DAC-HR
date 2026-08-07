import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import {
  application,
  candidate,
  candidatePosition,
} from "@workspace/db/schema";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { deleteFile } from "~/lib/storage";

export type CreateCandidateWithPositionsInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
  positionIds?: string[];
};

export const createCandidateWithPositions = async (
  input: CreateCandidateWithPositionsInput,
) => {
  const positionIds =
    input.positionIds?.map((id) => id.trim()).filter(Boolean) ?? [];

  const createdCandidate = await db.transaction(async (tx) => {
    const [newCandidate] = await tx
      .insert(candidate)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone?.trim() || null,
        locationCity: input.locationCity?.trim() || null,
        locationState: input.locationState?.trim() || null,
        location: input.location?.trim() || null,
        source: input.source || null,
        sourceUrl: input.sourceUrl?.trim() || null,
        note: input.note?.trim() || null,
      })
      .returning();

    if (!newCandidate) {
      throw new Error("Failed to create candidate");
    }

    const appIds: string[] = [];
    for (const positionId of positionIds) {
      const [app] = await tx
        .insert(application)
        .values({
          candidateId: newCandidate.id,
          positionId,
          status: "ai_screening",
        })
        .returning({ id: application.id });
      if (app) {
        appIds.push(app.id);
      }

      await tx.insert(candidatePosition).values({
        candidateId: newCandidate.id,
        positionId,
      });
    }

    return { candidate: newCandidate, applicationIds: appIds };
  });

  return {
    candidate: createdCandidate.candidate,
    applicationIds: createdCandidate.applicationIds,
    positionIds,
  };
};

export type DeleteCandidateResult = {
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidateById>>>;
  deletedDocuments: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
};

export const deleteCandidateWithAssets = async (
  candidateId: string,
): Promise<DeleteCandidateResult | null> => {
  const candidateData = await getCandidateById(candidateId);
  if (!candidateData) {
    return null;
  }

  const candidateDocuments = await getDocumentsByCandidateId(candidateId);

  const deletionPromises = candidateDocuments.map(async (doc) => {
    const promises: Promise<boolean>[] = [];

    if (doc.url) {
      promises.push(
        deleteFile(doc.url).catch((error) => {
          console.error(
            `[deleteCandidateWithAssets] Failed deleting Nextcloud doc ${doc.id}:`,
            error,
          );
          return false;
        }),
      );
    }

    await Promise.all(promises);
  });

  await Promise.all(deletionPromises);
  await db.delete(candidate).where(eq(candidate.id, candidateId));

  return {
    candidate: candidateData,
    deletedDocuments: candidateDocuments,
  };
};
