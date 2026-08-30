import { queryOptions } from "@tanstack/react-query";
import { loadEmailTemplate } from "#/features/email-templates/server/queries/email-templates";
import { queryKeys } from "#/lib/query/query-keys";

export function emailTemplateQueryOptions(type: string) {
  return queryOptions({
    queryKey: queryKeys.emailTemplates.detail(type),
    queryFn: async () => {
      const result = await loadEmailTemplate({ data: { type } });
      // SAFETY: the handler returns EmailTemplateData | null; the client wrapper
      // serializes it, so this restores the declared return type.
      return result as Awaited<ReturnType<typeof loadEmailTemplate>>;
    },
  });
}
