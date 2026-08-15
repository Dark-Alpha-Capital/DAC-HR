import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateApplicationDetail,
  invalidateApplicationLists,
  invalidateAdminUsers,
  invalidateCandidateDetail,
  invalidateCandidateLists,
  invalidateDocumentLists,
  invalidateEmployeeDetail,
  invalidateEmployeeLists,
  invalidatePositionLists,
  invalidateQuestionLists,
  invalidateRoundLists,
  invalidateWeeklyCheckinRecords,
} from "#/lib/query/invalidate";

export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  return {
    candidateLists: () => invalidateCandidateLists(queryClient),
    candidateDetail: (uid: string) =>
      invalidateCandidateDetail(queryClient, uid),
    applicationLists: () => invalidateApplicationLists(queryClient),
    applicationDetail: (id: string) =>
      invalidateApplicationDetail(queryClient, id),
    documentLists: () => invalidateDocumentLists(queryClient),
    employeeLists: () => invalidateEmployeeLists(queryClient),
    employeeDetail: (id: string) => invalidateEmployeeDetail(queryClient, id),
    positionLists: () => invalidatePositionLists(queryClient),
    roundLists: () => invalidateRoundLists(queryClient),
    questionLists: () => invalidateQuestionLists(queryClient),
    adminUsers: () => invalidateAdminUsers(queryClient),
    weeklyCheckinRecords: () => invalidateWeeklyCheckinRecords(queryClient),
  };
}
