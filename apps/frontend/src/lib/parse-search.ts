import { z } from "zod";

export function toStringArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  const cleaned = values.filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Coerces an unvalidated search-param value to a single optional string.
 * The value is parsed at this boundary; a string is used as-is, and an array
 * whose first element is a string contributes that element. Anything else
 * yields undefined.
 */
export function toOptionalString<T>(value: T): string | undefined {
  const asString = z.string().safeParse(value);
  if (asString.success) return asString.data || undefined;

  const asArray = z.array(z.unknown()).safeParse(value);
  if (!asArray.success) return undefined;
  const first = z.string().safeParse(asArray.data[0]);
  if (!first.success) return undefined;
  return first.data || undefined;
}

/**
 * Coerces an unvalidated search-param value to a page number. Strings are
 * parsed with parseInt, numbers are used as-is, and anything else (or an
 * out-of-range result) falls back to `fallback`.
 */
export function toPageNumber<T>(value: T, fallback = 1): number {
  const stringValue = z.string().safeParse(value);
  const numberValue = z.number().safeParse(value);
  const page = stringValue.success
    ? Number.parseInt(stringValue.data, 10)
    : numberValue.success
      ? numberValue.data
      : fallback;

  if (!Number.isFinite(page) || page < 1) return fallback;
  return page;
}

export function resetListPageParam(params: URLSearchParams) {
  params.delete("page");
}

export function searchFromLocationHref(href: string) {
  const query = href.includes("?") ? href.split("?")[1]?.split("#")[0] ?? "" : "";
  return new URLSearchParams(query);
}
