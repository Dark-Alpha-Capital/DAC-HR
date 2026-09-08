import * as z from "zod";

type IssueMessage = { message: string };

/** Field path → messages, e.g. `{ name: [{ message }] }` or `options[0].text`. */
export type FieldErrorMap = Record<string, IssueMessage[]>;

interface MappedValidation {
  form: FieldErrorMap;
  fields: FieldErrorMap;
}

function pathOf(segments: readonly (string | number)[]): string {
  let path = "";
  for (const [index, segment] of segments.entries()) {
    if (index === 0) {
      path = String(segment);
      // SAFETY: numeric segments from zod are array indexes and are mapped to
      // bracket notation so TanStack Form can attach them to array children.
    } else if (/^\d+$/.test(String(segment))) {
      path += `[${segment}]`;
    } else {
      path += `.${segment}`;
    }
  }
  return path;
}

/**
 * Zod schema validator for TanStack Form.
 *
 * Mirrors passing the raw zod schema to `validators` (issues are distributed to
 * each `form.Field`'s error map, so inline `FieldError`s can render), while
 * keeping the typing simple. Assign to both `onBlur` and `onSubmit`.
 */
export function zodFormValidator<TSchema extends z.ZodType>(schema: TSchema) {
  return function validator(props: {
    value: object;
  }): MappedValidation | undefined {
    const result = schema.safeParse(props.value);
    if (result.success) {
      return undefined;
    }
    const fields: FieldErrorMap = {};
    for (const issue of result.error.issues) {
      // SAFETY: zod object/array issue paths are strings/numbers; symbols never
      // appear as field keys in this app's form schemas.
      const key = pathOf(issue.path as (string | number)[]);
      const existing = fields[key] ?? [];
      existing.push({ message: issue.message });
      fields[key] = existing;
    }
    return { form: fields, fields };
  };
}
