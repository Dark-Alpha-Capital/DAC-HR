/**
 * Deletes a specific Document from a FileSearchStore.
 *
 * @param {string} storeId The ID of your FileSearchStore (e.g., 'my-store-123').
 * @param {string} documentId The ID of the Document to delete (e.g., 'the-doc-abc').
 * @param {boolean} force Optional. If true, any associated Chunks will also be deleted.
 * Set to true to prevent a FAILED_PRECONDITION error if the document
 * still contains chunks. Defaults to true for simplicity.
 * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful.
 */
async function deleteFileSearchStoreDocument(
  storeId: string,
  documentId: string,
  force: boolean = true
): Promise<boolean> {
  // IMPORTANT: Replace this with your actual Gemini API Key.
  // Using an API key directly in a query parameter works for some Gemini REST endpoints.
  const YOUR_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  let url = `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/${storeId}/documents/${documentId}?key=${YOUR_GEMINI_API_KEY}`;
  if (force) {
    url += `&force=true`;
  }

  console.log(`Attempting to delete document: ${documentId}`);

  try {
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (response.ok) {
      console.log(`✅ Document '${documentId}' deleted successfully.`);
      return true;
    } else {
      // Handle API error response
      const errorData = await response.json();
      console.error(`❌ Deletion failed with status: ${response.status}`);
      console.error("Error Details:", errorData);
      return false;
    }
  } catch (error) {
    console.error("An error occurred during the fetch operation:", error);
    return false;
  }
}

// --- EXAMPLE USAGE ---

const MY_FILE_STORE_ID = "candidatedocumentssearchsto-ihh3ywli34wi";

const DOCUMENT_TO_DELETE_ID = "tkdocxpdf-wiwhblw5a7y1";

deleteFileSearchStoreDocument(MY_FILE_STORE_ID, DOCUMENT_TO_DELETE_ID, true)
  .then((isDeleted) => {
    if (isDeleted) {
      // Document successfully deleted
    } else {
      console.log("Document was not deleted.");
    }
  })
  .catch((err) => {
    console.error("Final process failed:", err);
  });
