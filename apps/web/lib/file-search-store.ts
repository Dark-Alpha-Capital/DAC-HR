import { deleteFileSearchDocument } from "@workspace/file-search";

/**
 * Deletes a specific Document from a FileSearchStore.
 *
 * @param fileSearchDocumentName The full document name path (e.g., 'fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi/documents/humza-resume-wnf16gxlad8r')
 * @param force Optional. If true, any associated Chunks will also be deleted.
 */
export async function deleteFileSearchStoreDocument(
  fileSearchDocumentName: string,
  force: boolean = true,
): Promise<boolean> {
  try {
    return await deleteFileSearchDocument({
      fileSearchDocumentName,
      force,
    });
  } catch (error) {
    console.error("An error occurred during FileSearchStore deletion:", error);
    return false;
  }
}
