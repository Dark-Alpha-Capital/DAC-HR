import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import {
  loadContractSendTargets,
  loadContractTemplates,
} from "./server/queries/contracts";

export const contractTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.contracts.templates(),
    queryFn: async () => loadContractTemplates(),
  });

export const contractSendTargetsQueryOptions = (positionId: string) =>
  queryOptions({
    queryKey: queryKeys.contracts.sendTargets(positionId),
    queryFn: async () => loadContractSendTargets({ data: positionId }),
    enabled: positionId.length > 0,
  });
