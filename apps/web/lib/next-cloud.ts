import {
  createNextcloudClient,
  getDownloadUrl,
  normalizeFolderPath,
  uploadFile,
  type NextcloudConfig,
  type WebDAVClient,
} from "@workspace/nextcloud";

// Interface for deal files
export interface DealFile {
  name: string;
  size: number;
  lastModified: string;
  mimeType: string;
  downloadUrl: string;
}

const getNextcloudConfig = (): NextcloudConfig => {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!url || !user || !password) {
    throw new Error(
      "Nextcloud configuration is missing. Please set NEXTCLOUD_URL, NEXTCLOUD_USER, and NEXTCLOUD_PASSWORD environment variables.",
    );
  }

  return { url, user, password };
};

let _client: WebDAVClient | null = null;

export const getClient = (): WebDAVClient => {
  if (!_client) {
    _client = createNextcloudClient(getNextcloudConfig());
  }
  return _client;
};

/**
 * Uploads a file to Nextcloud
 * @param file - The file to upload (File or Blob)
 * @param folderPath - Optional folder path relative to user root (e.g., "/Documents" or "/Candidates")
 * @returns The download URL of the uploaded file
 */
export async function uploadFileToNextCloud(
  file: File | Blob,
  folderPath: string = "/Documents",
): Promise<string | null> {
  const client = getClient();
  const result = await uploadFile({ client, file, folderPath });

  if (!result.success || !result.downloadUrl) {
    console.error("Error uploading file to Nextcloud:", result.error);
    return null;
  }

  return result.downloadUrl;
}

/**
 * Lists all files in a specific Deal folder.
 * @param folderPath - The path relative to the user's root, e.g., "/Deals/Deal_Alpha"
 */
export async function listDealFiles(folderPath: string): Promise<DealFile[]> {
  try {
    const client = getClient();
    const contents = await client.getDirectoryContents(
      normalizeFolderPath(folderPath),
    );

    const files = (Array.isArray(contents) ? contents : [contents]).map(
      (item) => {
        const file = item as {
          basename?: string;
          size?: number;
          lastmod?: string;
          mime?: string;
          filename?: string;
          type?: string;
        };

        return {
          name: file.basename ?? "",
          size: file.size ?? 0,
          lastModified: file.lastmod ?? "",
          mimeType: file.mime ?? "",
          downloadUrl: getDownloadUrl(client, file.filename ?? ""),
          type: file.type ?? "",
        };
      },
    );

    return files
      .filter((file) => file.type !== "directory")
      .map(({ type: _ignored, ...file }) => file);
  } catch (error) {
    console.error("Error connecting to Nextcloud:", error);
    throw error;
  }
}
