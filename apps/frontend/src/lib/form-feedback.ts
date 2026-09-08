import { toast } from "sonner";

export type FieldMetaLike = {
  isTouched: boolean;
  errors: Array<{ message?: string } | undefined>;
};

/**
 * Standard predicate for showing an inline field error.
 *
 * Errors are rendered once the field has been blurred (`isTouched`) or the form
 * has been submitted at least once (`submissionAttempts > 0`) — never before,
 * so pristine forms don't nag. Pass `form.state.submissionAttempts`.
 */
export function shouldShowFieldError(
  meta: FieldMetaLike,
  submissionAttempts: number,
): boolean {
  return (
    meta.errors.length > 0 && (meta.isTouched || submissionAttempts > 0)
  );
}

/**
 * Normalizes a server-function result into a readable message. Server
 * functions in this app resolve `{ error?: string }` instead of throwing, so a
 * resolved `error` field means the mutation failed.
 */
export function resultErrorMessage(result: {
  error?: string;
}): string | undefined {
  const error = result.error;
  if (error && error.trim().length > 0) {
    return error;
  }
  return undefined;
}

/** Shows a toast for a failed server result; falls back when no message. */
export function toastResultError(
  result: { error?: string },
  fallback: string,
): void {
  toast.error(resultErrorMessage(result) ?? fallback, {
    position: "bottom-right",
  });
}

/** Flattens TanStack Form's field/error state into one readable list. */
export function flattenFormErrors(
  formState: {
    errorMap?: Record<string, { message?: string } | undefined>;
  },
): string[] {
  const messages: string[] = [];
  for (const entry of Object.values(formState.errorMap ?? {})) {
    if (entry?.message) {
      messages.push(entry.message);
    }
  }
  return [...new Set(messages)];
}
