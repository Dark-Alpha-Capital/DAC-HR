import { createServerFn } from "@tanstack/react-start";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getApplicationWithInterviews,
  getInterviewById,
} from "@workspace/db/repositories/interview-repository";

export const loadInterviewById = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const interview = await getInterviewById(id);

    if (!interview) {
      return { interview: null, application: null, candidate: null };
    }

    const application = await getApplicationWithInterviews(
      interview.applicationId,
    );
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    return { interview, application, candidate };
  });
