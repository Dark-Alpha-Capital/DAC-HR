export const normalizeFolderPath = (folderPath: string) => {
  const trimmed = folderPath.trim();
  if (!trimmed) {
    return "/";
  }

  const startsWithSlash = trimmed.startsWith("/");
  const normalized = trimmed.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return startsWithSlash ? normalized : `/${normalized}`;
};

export const sanitizePathSegment = (segment: string) => {
  const trimmed = segment.trim();
  if (!trimmed) {
    return "unknown";
  }

  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/[-_]+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
};

export const sanitizeIdSegment = (id: string) => {
  const trimmed = id.trim();
  if (!trimmed) {
    return "unknown";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const buildNamedEntityFolderPath = ({
  root,
  name,
  id,
}: {
  root: string;
  name?: string | null;
  id: string;
}) => {
  const normalizedRoot = normalizeFolderPath(root);
  const safeId = sanitizeIdSegment(id);
  const trimmedName = name?.trim();

  if (trimmedName) {
    const safeName = sanitizePathSegment(trimmedName);
    if (safeName && safeName !== "unknown") {
      return `${normalizedRoot}/${safeName}/${safeId}`;
    }
  }

  return `${normalizedRoot}/${safeId}`;
};

export const buildImportFolderPath = (importId: string) => {
  const normalizedRoot = normalizeFolderPath("/ATS/imports");
  const safeId = sanitizeIdSegment(importId);
  return `${normalizedRoot}/${safeId}`;
};

export const formatPersonName = (
  firstName?: string | null,
  lastName?: string | null,
) => `${firstName ?? ""} ${lastName ?? ""}`.trim();
