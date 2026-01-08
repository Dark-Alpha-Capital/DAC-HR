import { uploadFileToNextCloud, getClient } from "./next-cloud";

/**
 * Uploads a file to Nextcloud storage
 * @param file - The file to upload (File or Blob)
 * @param folderPath - Optional folder path (defaults to "/Documents")
 * @returns The URL of the uploaded file
 */
export const uploadFile = async (
  file: File | Blob,
  folderPath?: string
): Promise<string | null> => {
  try {
    // Determine folder path based on context if not provided
    // For candidate documents, use /Candidates folder
    // For general documents, use /Documents folder
    const defaultFolderPath = folderPath || "/Documents";

    const url = await uploadFileToNextCloud(file, defaultFolderPath);

    if (!url) {
      console.error("Failed to upload file to Nextcloud");
      return null;
    }

    return url;
  } catch (error) {
    console.error("Error uploading file to Nextcloud:", error);
    return null;
  }
};

/**
 * Generates a signed URL for accessing a file in Nextcloud
 * For Nextcloud, we return the WebDAV download link directly
 * @param fileUrl The WebDAV URL or file path of the file
 * @param expiresInMinutes How long the signed URL should be valid (default: 60 minutes) - Not used for Nextcloud
 * @returns A URL that allows access to the file
 */
export const getSignedUrl = async (
  fileUrl: string,
  expiresInMinutes: number = 60
): Promise<string | null> => {
  try {
    // For Nextcloud, if the URL is already a WebDAV download link, return it as-is
    // The WebDAV link already includes authentication via Basic Auth
    if (fileUrl.includes("/remote.php/dav/")) {
      return fileUrl;
    }

    // If it's a file path, construct the WebDAV download URL
    // Extract the file path from the URL if needed
    const client = getClient();

    // Try to extract the file path from various URL formats
    let filePath = fileUrl;

    // If it's a full URL, try to extract the path
    if (fileUrl.startsWith("http")) {
      try {
        const url = new URL(fileUrl);
        // Extract path after /remote.php/dav/files/{user}/
        const davPathMatch = url.pathname.match(
          /\/remote\.php\/dav\/files\/[^/]+\/(.+)/
        );
        if (davPathMatch) {
          filePath = `/${davPathMatch[1]}`;
        } else {
          // Fallback: use the pathname directly
          filePath = url.pathname;
        }
      } catch {
        // If URL parsing fails, assume it's already a path
        filePath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
      }
    } else {
      // Ensure path starts with /
      filePath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    }

    // Generate the WebDAV download link
    const downloadUrl = client.getFileDownloadLink(filePath);
    return downloadUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

/**
 * Deletes a file from Nextcloud
 * @param fileUrl The WebDAV URL or file path of the file to delete
 * @returns A promise that resolves to true if deletion was successful
 */
export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    const client = getClient();

    // Extract the file path from the URL
    let filePath: string;

    // If it's a WebDAV URL, extract the path
    if (fileUrl.includes("/remote.php/dav/files/")) {
      try {
        const url = new URL(fileUrl);
        // Extract path after /remote.php/dav/files/{user}/
        const davPathMatch = url.pathname.match(
          /\/remote\.php\/dav\/files\/[^/]+\/(.+)/
        );
        if (davPathMatch) {
          filePath = `/${davPathMatch[1]}`;
        } else {
          filePath = url.pathname;
        }
      } catch {
        // If URL parsing fails, try to extract manually
        const parts = fileUrl.split("/remote.php/dav/files/");
        const afterUserPart = parts[1];
        if (parts.length > 1 && afterUserPart) {
          const afterUser = afterUserPart.split("/").slice(1).join("/");
          filePath = `/${afterUser}`;
        } else {
          filePath = fileUrl;
        }
      }
    } else {
      // Assume it's already a file path
      filePath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    }

    // Check if file exists
    try {
      await client.stat(filePath);
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) {
        console.warn(`File not found in Nextcloud: ${filePath}`);
        return false;
      }
      // If it's not a 404, rethrow the error
      throw error;
    }

    // Delete the file
    await client.deleteFile(filePath);
    console.log(`✅ File '${filePath}' deleted successfully from Nextcloud.`);
    return true;
  } catch (error) {
    console.error("Error deleting file from Nextcloud:", error);
    return false;
  }
};
