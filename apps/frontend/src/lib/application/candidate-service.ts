import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import {
  application,
  candidate,
  candidatePosition,
} from "@workspace/db/schema";
import { deleteFileSearchDocument } from "@workspace/file-search";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { deleteFile } from "~/lib/storage";

export type CreateCandidateWithOptionalPositionInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
  positionId?: string | null;
};

export const createCandidateWithOptionalPosition = async (
  input: CreateCandidateWithOptionalPositionInput,
) => {
  const normalizedPositionId = input.positionId?.trim() || "";
  const hasPosition = normalizedPositionId !== "";

  const createdCandidate = await db.transaction(async (tx) => {
    const [newCandidate] = await tx
      .insert(candidate)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone?.trim() || null,
        location: input.location?.trim() || null,
        source: input.source || null,
        sourceUrl: input.sourceUrl?.trim() || null,
        note: input.note?.trim() || null,
      })
      .returning();

    if (!newCandidate) {
      throw new Error("Failed to create candidate");
    }

    if (hasPosition) {
      await tx.insert(application).values({
        candidateId: newCandidate.id,
        positionId: normalizedPositionId,
        status: "ai_screening",
      });

      await tx.insert(candidatePosition).values({
        candidateId: newCandidate.id,
        positionId: normalizedPositionId,
      });
    }

    return newCandidate;
  });

  return {
    candidate: createdCandidate,
    hasPosition,
    normalizedPositionId: normalizedPositionId || null,
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
            `[deleteCandidateWithAssets] Failed deleting GCS object for doc ${doc.id}:`,
            error,
          );
          return false;
        }),
      );
    }

    if (doc.fileSearchDocumentName) {
      promises.push(
        deleteFileSearchDocument({
          fileSearchDocumentName: doc.fileSearchDocumentName,
        }).catch((error) => {
          console.error(
            `[deleteCandidateWithAssets] Failed deleting FileSearchStore doc ${doc.id}:`,
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
