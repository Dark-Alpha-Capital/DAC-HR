import { createFileRoute } from "@tanstack/react-router";
import { candidateFormSchema } from "~/lib/schemas/candidate-form-schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getSession } from "~/lib/middleware/auth-guard";
import { createCandidateWithOptionalPosition } from "~/lib/application/candidate-service";

const redactEmail = (email: string | null | undefined): string => {
  if (!email) return "unknown";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) return "***";
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domainPart}`;
};

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
            source,
            sourceUrl,
            note,
            positionId,
          } = result.data;

          const {
            candidate: newCandidate,
            hasPosition,
            normalizedPositionId,
          } = await createCandidateWithOptionalPosition({
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
              createdBy: { id: user.id, email: user.email, name: user.name },
              metadata: {
                timestamp: new Date().toISOString(),
                hasPosition,
                applicationCreated: hasPosition,
              },
            },
          }).catch((error) =>
            console.error("Error inserting audit log:", error),
          );

          return Response.json(
            { success: true, data: newCandidate },
            { status: 201 },
          );
        } catch (error) {
          console.error(
            `Error creating candidate after ${Date.now() - startTime}ms:`,
            error,
          );
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
