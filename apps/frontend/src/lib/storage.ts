import {
  deleteFile as deleteNextcloudFile,
  getDownloadUrl,
  resolveFilePath,
  uploadFile as uploadToNextcloud,
} from "@workspace/nextcloud";
import { getServerNextcloudClient } from "~/lib/nextcloud-server";

/**
 * Uploads a file to Nextcloud storage
 * @param file - The file to upload (File or Blob)
 * @param folderPath - Optional folder path (defaults to "/Documents")
 * @returns The URL of the uploaded file
 */
export const uploadFile = async (
  file: File | Blob,
  folderPath?: string,
): Promise<string | null> => {
  try {
    const client = getServerNextcloudClient();
    const result = await uploadToNextcloud({
      client,
      file,
      folderPath: folderPath || "/Documents",
    });

    if (!result.success || !result.downloadUrl) {
      console.error("Failed to upload file to Nextcloud", result.error);
      return null;
    }

    return result.downloadUrl;
  } catch (error) {
    console.error("Error uploading file to Nextcloud:", error);
    return null;
  }
};

/**
 * Generates a signed URL for accessing a file in Nextcloud
 * For Nextcloud, this returns the WebDAV download link directly
 */
export const getSignedUrl = async (
  fileUrl: string,
  expiresInMinutes: number = 60,
): Promise<string | null> => {
  try {
    void expiresInMinutes;
    const client = getServerNextcloudClient();
    const filePath = resolveFilePath(fileUrl);
    return getDownloadUrl(client, filePath);
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
    const client = getServerNextcloudClient();
    const result = await deleteNextcloudFile({
      client,
      filePathOrUrl: fileUrl,
    });

    if (!result.success) {
      if (result.code === "NOT_FOUND") {
        console.warn(`File not found in Nextcloud: ${fileUrl}`);
        return false;
      }

      console.error("Error deleting file from Nextcloud:", result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting file from Nextcloud:", error);
    return false;
  }
};
