import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  interviewsService,
  type CreateInterviewInput,
  type UpdateInterviewInput,
  type CreateInterviewSessionInput,
  type CreateInterviewFeedbackInput,
  type BulkCreateInterviewFeedbackInput,
} from "../interviews-service";

export const createInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewInput) => data)
  .handler(async ({ data, context: { session } }) =>
    interviewsService.create(data, session.user),
  );

export const updateInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateInterviewInput) => data)
  .handler(async ({ data, context: { session } }) =>
    interviewsService.update(data, session.user),
  );

export const deleteInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: interviewId, context: { session } }) =>
    interviewsService.delete(interviewId, session.user),
  );

export const createInterviewSession = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewSessionInput) => data)
  .handler(async ({ data, context: { session } }) =>
    interviewsService.createSession(data, session.user),
  );

export const createInterviewFeedback = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewFeedbackInput) => data)
  .handler(async ({ data, context: { session } }) =>
    interviewsService.createFeedback(data, session.user),
  );

export const bulkCreateInterviewFeedback = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: BulkCreateInterviewFeedbackInput) => data)
  .handler(async ({ data, context: { session } }) =>
    interviewsService.bulkCreateFeedback(data, session.user),
  );

export const removeInterviewBundle = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId, context: { session } }) =>
    interviewsService.removeBundle(bundleId, session.user),
  );
