import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";

export async function invalidateCandidateLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.candidates.all });
}

export async function invalidateCandidateDetail(
  queryClient: QueryClient,
  uid: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.candidates.detail(uid),
    }),
    invalidateCandidateLists(queryClient),
  ]);
}

export async function invalidateApplicationLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.applications.all,
  });
}

export async function invalidateApplicationDetail(
  queryClient: QueryClient,
  id: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.applications.detail(id),
    }),
    invalidateApplicationLists(queryClient),
    invalidateCandidateLists(queryClient),
  ]);
}

export async function invalidateDocumentLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
}

export async function invalidateEmployeeLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
}

export async function invalidateEmployeeDetail(
  queryClient: QueryClient,
  id: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.employees.detail(id),
    }),
    invalidateEmployeeLists(queryClient),
  ]);
}

export async function invalidatePositionLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
}

export async function invalidateRoundLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all });
}

export async function invalidateQuestionLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.questions.all });
}

export async function invalidateAdminUsers(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
}

export async function invalidateWeeklyCheckinRecords(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.weeklyCheckin.all,
  });
}
