/**
 * Resolves a stored document URL to a client-fetchable URL.
 * Nextcloud URLs are returned as-is; Google-storage / gs:// URLs are exchanged
 * for a signed URL via `/api/documents/view`. Single seam for the access-URL
 * dance that used to be duplicated across document components.
 */
export async function resolveDocumentAccessUrl(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const isGoogleStorage = url.startsWith("gs://") || url.includes("storage.googleapis.com");
  if (!isGoogleStorage) {
    return url;
  }

  const response = await fetch(`/api/documents/view?url=${encodeURIComponent(url)}`, {
    signal,
  });

  if (!response.ok) {
    // SAFETY: the /api/documents/view route responds with `{ error }` on failure.
    const errorData = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errorData?.error || "Failed to generate access URL");
  }

  // SAFETY: the /api/documents/view route responds with `{ url }` on success.
  const { url: signedUrl } = (await response.json()) as { url: string };
  return signedUrl;
}
