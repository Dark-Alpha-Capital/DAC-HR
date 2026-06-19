import { createClient, type WebDAVClient } from "webdav";

export type { WebDAVClient };

export type NextcloudConfig = {
  url: string;
  user: string;
  password: string;
};

export type NextcloudErrorCode =
  | "INVALID_CONFIG"
  | "UPLOAD_FAILED"
  | "DOWNLOAD_FAILED"
  | "DELETE_FAILED"
  | "NOT_FOUND"
  | "NETWORK"
  | "UNKNOWN";

export type NextcloudOperationResult = {
  success: boolean;
  error?: string;
  code?: NextcloudErrorCode;
};

export type UploadFileResult = NextcloudOperationResult & {
  filePath?: string;
  downloadUrl?: string;
  fileName?: string;
};

export type DownloadFileResult = NextcloudOperationResult & {
  filePath?: string;
  buffer?: Buffer;
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

export const normalizeFolderPath = (folderPath: string) => {
  const trimmed = folderPath.trim();
  if (!trimmed) {
    return "/";
  }

  const startsWithSlash = trimmed.startsWith("/");
  const normalized = trimmed.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return startsWithSlash ? normalized : `/${normalized}`;
};

export const sanitizeFilename = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");

export const createNextcloudClient = (
  config: NextcloudConfig,
): WebDAVClient => {
  if (!config.url || !config.user || !config.password) {
    throw new Error(
      "Invalid Nextcloud config. Expected url, user, and password.",
    );
  }

  return createClient(
    `${normalizeBaseUrl(config.url)}/remote.php/dav/files/${config.user}`,
    {
      username: config.user,
      password: config.password,
    },
  );
};

export const getNextcloudConfigFromEnv = (): NextcloudConfig => {
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

export const getNextcloudClient = (config?: NextcloudConfig): WebDAVClient => {
  if (!_client) {
    _client = createNextcloudClient(config ?? getNextcloudConfigFromEnv());
  }

  return _client;
};

export type NextcloudFileEntry = {
  name: string;
  size: number;
  lastModified: string;
  mimeType: string;
  downloadUrl: string;
};

const asBuffer = async (file: File | Blob) => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const resolveFileName = (file: File | Blob, providedFileName?: string) => {
  if (providedFileName && providedFileName.trim() !== "") {
    return sanitizeFilename(providedFileName.trim());
  }

  if (file instanceof File && file.name) {
    return sanitizeFilename(file.name);
  }

  const extension = file.type?.split("/")?.[1] || "bin";
  return `upload-${Date.now()}.${extension}`;
};

const mapErrorCode = (error: unknown): NextcloudErrorCode => {
  const message = error instanceof Error ? error.message : "";
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : undefined;

  if (status === 404 || message.includes("404")) {
    return "NOT_FOUND";
  }

  if (message.toLowerCase().includes("network")) {
    return "NETWORK";
  }

  return "UNKNOWN";
};

export const uploadFile = async ({
  client,
  file,
  folderPath,
  fileName,
  overwrite = true,
}: {
  client: WebDAVClient;
  file: File | Blob;
  folderPath: string;
  fileName?: string;
  overwrite?: boolean;
}): Promise<UploadFileResult> => {
  try {
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    const resolvedFileName = resolveFileName(file, fileName);
    const filePath = `${normalizedFolderPath}/${resolvedFileName}`;

    try {
      await client.createDirectory(normalizedFolderPath, { recursive: true });
    } catch {
      // Directory may already exist.
    }

    const buffer = await asBuffer(file);
    await client.putFileContents(filePath, buffer, {
      overwrite,
      contentLength: buffer.length,
    });

    return {
      success: true,
      filePath,
      downloadUrl: client.getFileDownloadLink(filePath),
      fileName: resolvedFileName,
    };
  } catch (error) {
    const code = mapErrorCode(error);
    return {
      success: false,
      code: code === "UNKNOWN" ? "UPLOAD_FAILED" : code,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
};

const extractPathFromDavUrl = (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);
    const match = url.pathname.match(/\/remote\.php\/dav\/files\/[^/]+\/(.+)/);
    if (match?.[1]) {
      return `/${match[1]}`;
    }
    return url.pathname;
  } catch {
    return fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  }
};

export const resolveFilePath = (filePathOrUrl: string): string => {
  if (filePathOrUrl.includes("/remote.php/dav/files/")) {
    return extractPathFromDavUrl(filePathOrUrl);
  }

  if (
    filePathOrUrl.startsWith("http://") ||
    filePathOrUrl.startsWith("https://")
  ) {
    return extractPathFromDavUrl(filePathOrUrl);
  }

  return filePathOrUrl.startsWith("/") ? filePathOrUrl : `/${filePathOrUrl}`;
};

export const getDownloadUrl = (client: WebDAVClient, filePath: string) =>
  client.getFileDownloadLink(resolveFilePath(filePath));

export const downloadFile = async ({
  client,
  filePathOrUrl,
}: {
  client: WebDAVClient;
  filePathOrUrl: string;
}): Promise<DownloadFileResult> => {
  try {
    const filePath = resolveFilePath(filePathOrUrl);
    const contents = await client.getFileContents(filePath);
    const buffer = Buffer.isBuffer(contents)
      ? contents
      : typeof contents === "string"
        ? Buffer.from(contents)
        : Buffer.from(new Uint8Array(contents as ArrayBuffer));

    return {
      success: true,
      filePath,
      buffer,
    };
  } catch (error) {
    const code = mapErrorCode(error);
    return {
      success: false,
      code: code === "UNKNOWN" ? "DOWNLOAD_FAILED" : code,
      error: error instanceof Error ? error.message : "Failed to download file",
    };
  }
};

export const deleteFile = async ({
  client,
  filePathOrUrl,
}: {
  client: WebDAVClient;
  filePathOrUrl: string;
}): Promise<NextcloudOperationResult> => {
  try {
    const filePath = resolveFilePath(filePathOrUrl);
    await client.deleteFile(filePath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      code: mapErrorCode(error) || "DELETE_FAILED",
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
};

export const listDirectoryFiles = async (
  folderPath: string,
  client: WebDAVClient = getNextcloudClient(),
): Promise<NextcloudFileEntry[]> => {
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
};
