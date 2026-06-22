export function toStringArray(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  const cleaned = values.filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0] || undefined;
  }
  return undefined;
}

export function toPageNumber(value: unknown, fallback = 1): number {
  const page =
    typeof value === "string"
      ? Number.parseInt(value, 10)
      : typeof value === "number"
        ? value
        : fallback;

  if (!Number.isFinite(page) || page < 1) return fallback;
  return page;
}

export function searchFromLocationHref(href: string) {
  const query = href.includes("?") ? href.split("?")[1]?.split("#")[0] ?? "" : "";
  return new URLSearchParams(query);
}
