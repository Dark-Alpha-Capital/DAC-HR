import { eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import { candidateDocument, candidateProfile } from "@workspace/db/schema";
import {
  buildNamedEntityFolderPath,
  formatPersonName,
} from "@workspace/nextcloud";
import { importLog } from "../logger";
import type {
  ImportDocumentInput,
  ImportServices,
  TriggerDocumentIndexingFn,
} from "../types";

export async function attachImportResume(args: {
  candidateId: string;
  firstName: string;
  lastName: string;
  document: ImportDocumentInput;
  resumeText?: string | null;
  importId: string;
  rowIndex: number;
  services: ImportServices;
}): Promise<{ documentId: string }> {
  const { candidateId, document, resumeText, importId, rowIndex, services } =
    args;

  const folderPath = buildNamedEntityFolderPath({
    root: "/ATS/candidates",
    name: formatPersonName(args.firstName, args.lastName),
    id: candidateId,
  });

  importLog("log", "Uploading document to Nextcloud", {
    step: "unified.document_upload_start",
    importId,
    rowIndex,
    candidateId,
    fileName: document.fileName,
    folderPath,
  });

  const uploadResult = await services.uploadToNextcloud({
    buffer: document.buffer.slice(),
    fileName: document.fileName,
    folderPath,
  });

  if (!uploadResult) {
    throw new Error("Failed to upload resume to Nextcloud");
  }

  importLog("log", "Document uploaded to Nextcloud", {
    step: "unified.document_uploaded",
    importId,
    rowIndex,
    candidateId,
    filePath: uploadResult.filePath,
  });

  const [doc] = await db
    .insert(candidateDocument)
    .values({
      candidateId,
      name: document.fileName,
      description: "Imported resume",
      category: document.category,
      url: uploadResult.url,
      tags: ["import"],
    })
    .returning();

  if (!doc) {
    throw new Error("Failed to create candidate document");
  }

  if (resumeText?.trim()) {
    const existingProfile = await db
      .select({ candidateId: candidateProfile.candidateId })
      .from(candidateProfile)
      .where(eq(candidateProfile.candidateId, candidateId))
      .limit(1);

    if (existingProfile[0]) {
      await db
        .update(candidateProfile)
        .set({ resumeText: resumeText.trim() })
        .where(eq(candidateProfile.candidateId, candidateId));
    } else {
      await db.insert(candidateProfile).values({
        candidateId,
        resumeText: resumeText.trim(),
      });
    }
  }

  const triggerIndexing: TriggerDocumentIndexingFn | undefined =
    services.triggerDocumentIndexing;

  if (triggerIndexing) {
    importLog("log", "Triggering document indexing workflow", {
      step: "unified.indexing_triggered",
      importId,
      rowIndex,
      candidateId,
      documentId: doc.id,
    });

    await triggerIndexing({
      documentId: doc.id,
      nextcloudFilePath: uploadResult.filePath,
    });
  }

  return { documentId: doc.id };
}
