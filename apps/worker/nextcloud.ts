import { createClient } from "webdav";

function getConfig() {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;
  if (!url || !user || !password) {
    throw new Error("NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD required");
  }
  return { url, user, password };
}

export function getNextcloudClient() {
  const { url, user, password } = getConfig();
  const clientUrl = `${url}/remote.php/dav/files/${user}`;
  return createClient(clientUrl, { username: user, password });
}

export async function getFileContents(path: string): Promise<Buffer | null> {
  try {
    const client = getNextcloudClient();
    const contents = await client.getFileContents(path);
    return Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(contents as ArrayBuffer);
  } catch (err) {
    console.error("[nextcloud] getFileContents error:", err);
    return null;
  }
}

export async function uploadToNextcloud(
  buffer: Buffer,
  folderPath: string,
  fileName: string,
): Promise<string | null> {
  try {
    const client = getNextcloudClient();
    const normalized =
      folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
    const filePath = `${normalized}/${fileName}`;
    await client.createDirectory(normalized, { recursive: true }).catch(() => {});
    await client.putFileContents(filePath, buffer, {
      overwrite: true,
      contentLength: buffer.length,
    });
    return client.getFileDownloadLink(filePath);
  } catch (err) {
    console.error("[nextcloud] upload error:", err);
    return null;
  }
}
