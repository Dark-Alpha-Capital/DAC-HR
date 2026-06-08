import { GoogleGenAI } from "@google/genai";

export type FileSearchMetadata = {
  key: string;
  stringValue?: string;
};

export type FileSearchClient = ReturnType<typeof createFileSearchClient>;

export type FileSearchClientConfig = {
  apiKey?: string;
};

export const createFileSearchClient = ({
  apiKey,
}: FileSearchClientConfig = {}) => {
  const resolvedApiKey = apiKey ?? process.env.GEMINI_API_KEY;

  if (!resolvedApiKey || resolvedApiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is required for file search operations");
  }

  const googleGenAI = new GoogleGenAI({
    apiKey: resolvedApiKey,
  });

  return {
    googleGenAI,
  };
};

export const uploadDocumentToStore = async ({
  client,
  file,
  fileSearchStoreName,
  displayName,
  customMetadata,
}: {
  client: FileSearchClient;
  file: Blob;
  fileSearchStoreName: string;
  displayName: string;
  customMetadata?: FileSearchMetadata[];
}) => {
  return client.googleGenAI.fileSearchStores.uploadToFileSearchStore({
    file,
    fileSearchStoreName,
    config: {
      displayName,
      customMetadata,
    },
  });
};

export const waitForIndexing = async ({
  client,
  operation,
  pollIntervalMs = 5000,
  maxAttempts = 24,
}: {
  client: FileSearchClient;
  operation: any;
  pollIntervalMs?: number;
  maxAttempts?: number;
}) => {
  let currentOperation = operation;
  let attempts = 0;

  while (!currentOperation.done && attempts < maxAttempts) {
    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    currentOperation = await client.googleGenAI.operations.get({
      operation: currentOperation,
    });
  }

  if (!currentOperation.done) {
    throw new Error(
      `File search indexing timed out after ${(maxAttempts * pollIntervalMs) / 1000}s`,
    );
  }

  return currentOperation;
};

export const uploadAndIndexDocument = async ({
  client,
  file,
  fileSearchStoreName,
  displayName,
  customMetadata,
  pollIntervalMs,
  maxAttempts,
}: {
  client: FileSearchClient;
  file: Blob;
  fileSearchStoreName: string;
  displayName: string;
  customMetadata?: FileSearchMetadata[];
  pollIntervalMs?: number;
  maxAttempts?: number;
}) => {
  const operation = await uploadDocumentToStore({
    client,
    file,
    fileSearchStoreName,
    displayName,
    customMetadata,
  });

  const completedOperation = await waitForIndexing({
    client,
    operation,
    pollIntervalMs,
    maxAttempts,
  });

  return completedOperation.response?.documentName || null;
};

export const generateContentWithFileSearch = async ({
  client,
  model,
  prompt,
  fileSearchStoreNames,
  metadataFilter,
}: {
  client: FileSearchClient;
  model: string;
  prompt: string;
  fileSearchStoreNames: string[];
  metadataFilter?: string;
}) => {
  return client.googleGenAI.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames,
            ...(metadataFilter ? { metadataFilter } : {}),
          },
        },
      ],
    },
  });
};

export const parseFileSearchDocumentName = (fileSearchDocumentName: string) => {
  const parts = fileSearchDocumentName.split("/");

  if (
    parts.length < 4 ||
    parts[0] !== "fileSearchStores" ||
    parts[2] !== "documents"
  ) {
    return null;
  }

  return {
    storeId: parts[1],
    documentId: parts.slice(3).join("/"),
  };
};

export const deleteFileSearchDocument = async ({
  fileSearchDocumentName,
  force = true,
  apiKey,
}: {
  fileSearchDocumentName: string;
  force?: boolean;
  apiKey?: string;
}) => {
  const parsed = parseFileSearchDocumentName(fileSearchDocumentName);
  if (!parsed) {
    return false;
  }

  const resolvedApiKey = apiKey ?? process.env.GEMINI_API_KEY;
  if (!resolvedApiKey || resolvedApiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is required for file search operations");
  }

  let url = `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/${parsed.storeId}/documents/${parsed.documentId}?key=${resolvedApiKey}`;
  if (force) {
    url += "&force=true";
  }

  const response = await fetch(url, {
    method: "DELETE",
  });

  return response.ok;
};
