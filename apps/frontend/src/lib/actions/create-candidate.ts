import { createServerFn } from "@tanstack/react-start";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { getSession } from "~/lib/middleware/auth-guard";
import { createCandidateWithOptionalPosition } from "~/lib/application/candidate-service";

export const createCandidate = createServerFn({ method: "POST" })
  .validator((data: CandidateFormSchema) => data)
  .handler(async ({ data }) => {
    const session = await getSession();

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
      insertAuditLog({
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
            positionId: normalizedPositionId,
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
            hasPosition,
            applicationCreated: hasPosition,
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newCandidate };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create candidate" };
    }
  });
