import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { application, candidate, candidateProfile, position } from "../schema";
import { getInterviewsByApplicationId } from "./interview-repository";

export const getCandidateById = async (id: string) => {
  try {
    const [candidateResult] = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, id));

    if (!candidateResult) {
      return null;
    }

    const applications = await db
      .select({ positionId: application.positionId })
      .from(application)
      .where(eq(application.candidateId, id));

    return {
      ...candidateResult,
      positionId: applications[0]?.positionId ?? null,
      positionIds: applications.map((a) => a.positionId),
    };
  } catch (error) {
    console.error("Error fetching candidate by id", error);
    return null;
  }
};

export const getCandidateWithApplications = async (id: string) => {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    console.error("Invalid candidate ID provided:", id);
    return null;
  }

  try {
    const [candidateResult] = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, id));

    if (!candidateResult) {
      return null;
    }

    const applications = await db
      .select({
        id: application.id,
        status: application.status,
        personality: application.personality,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
          description: position.description,
        },
      })
      .from(application)
      .innerJoin(position, eq(application.positionId, position.id))
      .where(eq(application.candidateId, id))
      .orderBy(asc(application.createdAt));

    const applicationsWithInterviews = await Promise.all(
      applications.map(async (app) => {
        const interviews = await getInterviewsByApplicationId(app.id);
        return {
          ...app,
          interviews,
        };
      }),
    );

    const [profile] = await db
      .select()
      .from(candidateProfile)
      .where(eq(candidateProfile.candidateId, id));

    return {
      ...candidateResult,
      profile: profile ?? null,
      applications: applicationsWithInterviews,
    };
  } catch (error) {
    console.error("Error fetching candidate with applications");
    console.error("Candidate ID:", id);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }
    return null;
  }
};
