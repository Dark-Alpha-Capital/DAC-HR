declare global {
  // Minimal R2 type declarations for Cloudflare Workers
  interface R2Bucket {
    put(key: string, value: ArrayBuffer | Blob | File | string | null, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    get(key: string): Promise<{ body: ReadableStream } | null>;
    delete(key: string): Promise<void>;
  }
  var __env: Record<string, unknown> | undefined;
}

import {
  uploadFile as uploadToNextcloud,
  deleteFile as deleteFromNextcloud,
} from "./storage";

let r2Bucket: R2Bucket | null = null;

function getR2Bucket(): R2Bucket | null {
  if (r2Bucket) return r2Bucket;

  try {
    const g = globalThis as Record<string, unknown>;
    if (typeof g.__env === "object" && g.__env !== null) {
      const env = g.__env as Record<string, R2Bucket>;
      if (env.DOCUMENTS_BUCKET) {
        r2Bucket = env.DOCUMENTS_BUCKET;
        return r2Bucket;
      }
    }
  } catch {
    // Not in Workers runtime
  }

  return null;
}

export async function uploadDocument(
  key: string,
  file: File | Blob,
  contentType?: string,
): Promise<string | null> {
  const bucket = getR2Bucket();

  if (bucket) {
    try {
      await bucket.put(key, file, {
        httpMetadata: contentType ? { contentType } : undefined,
      });
      return key;
    } catch (error) {
      console.error("R2 upload failed:", error);
      return null;
    }
  }

  return uploadToNextcloud(file, "Documents");
}

export async function getDocumentUrl(key: string): Promise<string | null> {
  const bucket = getR2Bucket();

  if (bucket) {
    return key;
  }

  return key;
}

export async function deleteDocument(key: string): Promise<boolean> {
  const bucket = getR2Bucket();

  if (bucket) {
    try {
      await bucket.delete(key);
      return true;
    } catch (error) {
      console.error("R2 delete failed:", error);
      return false;
    }
  }

  return deleteFromNextcloud(key);
}
