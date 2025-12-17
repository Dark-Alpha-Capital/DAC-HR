import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.split(String.raw`\n`).join("\n"),
  },
});

const BUCKET = process.env.GCLOUD_BUCKET;

export const uploadFile = async (file: File | Blob) => {
  try {
    const bucket = storage.bucket(BUCKET as string);
    const fileName = file instanceof File ? file.name : `upload-${Date.now()}`;
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream();

    // Convert File/Blob to Buffer
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
 * Deletes a file from Google Cloud Storage
 * @param fileUrl The public URL or GCS path of the file to delete
 * @returns A promise that resolves to true if deletion was successful
 */
export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    const bucket = storage.bucket(BUCKET as string);

    // Extract the file path from the URL
    let fileName: string;

    if (fileUrl.startsWith("gs://")) {
      fileName = fileUrl.replace(`gs://${BUCKET}/`, "");
      fileName = decodeURIComponent(fileName);
    } else if (fileUrl.includes("storage.googleapis.com")) {
      try {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts[0] === BUCKET) {
          pathParts.shift();
        }
        fileName = decodeURIComponent(pathParts.join("/"));
      } catch {
        const urlParts = fileUrl.split("/");
        const filenamePart = urlParts.slice(4).join("/");
        fileName = decodeURIComponent(filenamePart);
      }
    } else {
      fileName = decodeURIComponent(fileUrl);
    }

    const file = bucket.file(fileName);
    const [exists] = await file.exists();

    if (!exists) {
      console.warn(`File not found in GCS: ${fileName}`);
      return false;
    }

    await file.delete();
    console.log(`✅ File '${fileName}' deleted successfully from GCS.`);
    return true;
  } catch (error) {
    console.error("Error deleting file from GCS:", error);
    return false;
  }
};
