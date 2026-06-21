import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { createCandidateWithPositions } from "~/lib/application/candidate-service";

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CandidateFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {

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
      positionIds,
    } = result.data;
    try {
      const {
        candidate: newCandidate,
        positionIds: createdPositionIds,
      } = await createCandidateWithPositions({
          firstName,
          lastName,
          email,
          phone,
          location,
          source,
          sourceUrl,
          note,
          positionIds,
        });
      const hasPositions = createdPositionIds.length > 0;

      insertAuditLog({
        userId: session.user.id,
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
            positionIds: createdPositionIds,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            hasPositions,
            applicationsCreated: createdPositionIds.length,
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
