import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  createInterview as createInterviewService,
  updateInterview as updateInterviewService,
  deleteInterview as deleteInterviewService,
  createInterviewSession as createInterviewSessionService,
  createInterviewFeedback as createInterviewFeedbackService,
  bulkCreateInterviewFeedback as bulkCreateInterviewFeedbackService,
  removeInterviewBundle as removeInterviewBundleService,
  type CreateInterviewInput,
  type UpdateInterviewInput,
  type CreateInterviewSessionInput,
  type CreateInterviewFeedbackInput,
  type BulkCreateInterviewFeedbackInput,
} from "#/features/interviews/interviews-service";

export const createInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return createInterviewService(data, session.user);
  });

export const updateInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateInterviewInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return updateInterviewService(data, session.user);
  });

export const deleteInterview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: interviewId, context: { session } }) => {
    return deleteInterviewService(interviewId, session.user);
  });

export const createInterviewSession = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewSessionInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return createInterviewSessionService(data, session.user);
  });

export const createInterviewFeedback = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewFeedbackInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return createInterviewFeedbackService(data, session.user);
  });

export const bulkCreateInterviewFeedback = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: BulkCreateInterviewFeedbackInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return bulkCreateInterviewFeedbackService(data, session.user);
  });

export const removeInterviewBundle = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId, context: { session } }) => {
    return removeInterviewBundleService(bundleId, session.user);
  });
