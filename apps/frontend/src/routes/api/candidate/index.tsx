import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidateFormSchema } from "#/features/candidates/schemas";
import { candidatesService } from "#/features/candidates/server/candidates-service";
import { CandidateConflictError } from "#/features/candidates/server/unique-constraint";

export const Route = createFileRoute("/api/candidate/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json(
              { success: false, message: "Unauthorized" },
              { status: 401 },
            );
          }
          const { user } = authSession;

          const body = await request.json();

          const result = candidateFormSchema.safeParse(body);
          if (!result.success) {
            return Response.json(
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
            locationCity,
            locationState,
            source,
            sourceUrl,
            note,
            positionIds,
          } = result.data;

          const {
            candidate: newCandidate,
            positionIds: createdPositionIds,
            applicationIds: createdApplicationIds,
          } = await candidatesService.createWithPositions({
            firstName,
            lastName,
            email,
            phone,
            location,
            locationCity,
            locationState,
            source,
            sourceUrl,
            note,
            positionIds,
          });
          const hasPositions = createdPositionIds.length > 0;

          candidatesService.insertAudit({
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
                locationCity: locationCity?.trim() || null,
                locationState: locationState?.trim() || null,
                source: source || null,
                sourceUrl: sourceUrl?.trim() || null,
                note: note?.trim() || null,
                positionIds: createdPositionIds,
              },
              createdBy: { id: user.id, email: user.email, name: user.name },
              metadata: {
                timestamp: new Date().toISOString(),
                hasPositions,
                applicationsCreated: createdPositionIds.length,
              },
            },
          }).catch((error) =>
            console.error("Error inserting audit log:", error),
          );

          return Response.json(
            {
              success: true,
              data: newCandidate,
              applicationIds: createdApplicationIds,
            },
            { status: 201 },
          );
        } catch (error) {
          console.error(
            `Error creating candidate after ${Date.now() - startTime}ms:`,
            error,
          );
          if (error instanceof CandidateConflictError) {
            return Response.json(
              {
                error: error.message,
                existingCandidateId: error.existingCandidateId,
              },
              { status: 409 },
            );
          }
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to create candidate",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
