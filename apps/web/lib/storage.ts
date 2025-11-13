import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.split(String.raw`\n`).join("\n"),
  },
});

const BUCKET = process.env.GCLOUD_BUCKET;

export const uploadFile = async (file: File) => {
  try {
    const bucket = storage.bucket(BUCKET as string);
    const blob = bucket.file(file.name);
    const blobStream = blob.createWriteStream();

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise((resolve, reject) => {
      blobStream.on("error", reject);
      blobStream.on("finish", resolve);
      blobStream.end(buffer);
    });

    return blob.publicUrl();
  } catch (error) {
    console.log("error upload to blob");

    console.error(error);
    return null;
  }
};

/**
 * Generates a signed URL for accessing a file in Google Cloud Storage
 * @param fileUrl The public URL or GCS path of the file
 * @param expiresInMinutes How long the signed URL should be valid (default: 60 minutes)
 * @returns A signed URL that allows temporary access to the file
 */
export const getSignedUrl = async (
  fileUrl: string,
  expiresInMinutes: number = 60
): Promise<string | null> => {
  try {
    const bucket = storage.bucket(BUCKET as string);

    // Extract the file path from the URL
    // Handle both gs:// URLs and https://storage.googleapis.com URLs
    let fileName: string;

    if (fileUrl.startsWith("gs://")) {
      fileName = fileUrl.replace(`gs://${BUCKET}/`, "");
      // Decode URL encoding in the filename
      fileName = decodeURIComponent(fileName);
    } else if (fileUrl.includes("storage.googleapis.com")) {
      try {
        // Parse the URL properly to handle encoding
        const url = new URL(fileUrl);
        // Extract the pathname and remove the leading slash and bucket name
        const pathParts = url.pathname.split("/").filter(Boolean);
        // Remove the bucket name (first part)
        if (pathParts[0] === BUCKET) {
          pathParts.shift();
        }
        // Join the remaining parts and decode
        fileName = decodeURIComponent(pathParts.join("/"));
      } catch {
        // Fallback: Extract filename manually if URL parsing fails
        const urlParts = fileUrl.split("/");
        const filenamePart = urlParts.slice(4).join("/"); // Skip https:, '', storage.googleapis.com, bucket-name
        fileName = decodeURIComponent(filenamePart);
      }
    } else {
      // Assume it's just the filename, decode it
      fileName = decodeURIComponent(fileUrl);
    }

    console.log(`Looking for file: ${fileName}`);

    let file = bucket.file(fileName);

    // Check if file exists
    let [exists] = await file.exists();

    // If file not found, try with the original encoded filename from URL
    // (in case the file was stored with URL-encoded characters)
    if (!exists && fileUrl.includes("storage.googleapis.com")) {
      try {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split("/").filter(Boolean);
        // Remove bucket name if present
        if (pathParts[0] === BUCKET) {
          pathParts.shift();
        }
        const originalEncoded = pathParts.join("/");
        console.log(`Trying original encoded filename: ${originalEncoded}`);
        file = bucket.file(originalEncoded);
        [exists] = await file.exists();
      } catch (e) {
        // If URL parsing fails, try extracting manually
        const urlParts = fileUrl.split("/");
        const originalEncoded = urlParts.slice(4).join("/");
        console.log(
          `Trying manually extracted encoded filename: ${originalEncoded}`
        );
        file = bucket.file(originalEncoded);
        [exists] = await file.exists();
      }
    }

    if (!exists) {
      console.error(`File not found after trying: ${fileName}`);
      // Try listing files to debug
      const prefix = fileName.split("/")[0];
      const [files] = await bucket.getFiles({ prefix, maxResults: 10 });
      console.log(
        `Files with prefix ${prefix}:`,
        files.map((f) => f.name)
      );
      return null;
    }

    // Generate signed URL valid for specified minutes
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};
