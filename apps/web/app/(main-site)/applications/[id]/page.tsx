import {
  getApplicationWithInterviews,
  getApplicationById,
  getCandidateById,
} from "@workspace/db/queries";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

// Cached function for application with interviews
async function CachedApplicationForMetadata(applicationId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`application-${applicationId}`);

  const application = await getApplicationWithInterviews(applicationId);

  // Add position cache tag to enable invalidation when rounds change
  if (application) {
    cacheTag(`position-${application.positionId}`);
  }

  return application;
}

// Cached function for candidate
async function CachedCandidateById(candidateId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-${candidateId}`);

  return await getCandidateById(candidateId);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const application = await CachedApplicationForMetadata(id);

  if (!application) {
    return {
      title: "Application Not Found - DAC HR",
      description:
        "The application you're looking for doesn't exist or has been removed.",
    };
  }

  const candidate = await CachedCandidateById(application.candidateId);
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : "Candidate";
  const statusCapitalized =
    application.status.charAt(0).toUpperCase() + application.status.slice(1);

  return {
    title: `${application.position.name} - Application - DAC HR`,
    description: `Application for ${application.position.name} by ${candidateName}. Status: ${statusCapitalized}. ${
      application.interviews && application.interviews.length > 0
        ? `${application.interviews.length} interview(s) recorded.`
        : ""
    }`,
  };
}

const ApplicationPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) {
    redirect("/applications");
  }

  redirect(
    `/candidates/${application.candidateId}?tab=applications&application=${id}`,
  );
};

export default ApplicationPage;

