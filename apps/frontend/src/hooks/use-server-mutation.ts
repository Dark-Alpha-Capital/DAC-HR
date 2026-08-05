import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ActionResult = {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
};

type Options<TResult> = {
  /** Query keys to invalidate after a successful mutation. */
  invalidate?: ReadonlyArray<readonly unknown[]>;
  /** Shown on success (string or derived from the result). */
  successMessage?: string | ((result: TResult) => string);
  onSuccess?: (result: TResult) => void;
};

/**
 * One seam for mutations that call server functions. Server functions resolve
 * with an `{ error? }` shape rather than throwing, so a resolved result with an
 * `error` field is treated as a failure (toast + no invalidation) — matching
 * the app's existing convention while adding shared pending/error/invalidation.
 */
export function useServerMutation<TInput extends { data: unknown }, TResult extends ActionResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  options: Options<TResult> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (options.successMessage) {
        toast.success(
          typeof options.successMessage === "function"
            ? options.successMessage(result)
            : options.successMessage,
        );
      }
      options.onSuccess?.(result);
      for (const key of options.invalidate ?? []) {
        queryClient.invalidateQueries({ queryKey: key as string[] });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });
}
