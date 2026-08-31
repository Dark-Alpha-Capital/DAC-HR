import { importLog, type ImportFileType } from "../logger";
import { ImportCancelledError } from "../cancellation";
import { extractDocumentText } from "../pdf/extract-text";
import { createCandidateFromImport } from "../unified/create-candidate-from-import";
import { extractResumeFieldsFromText } from "../parsers/extract-resume-fields";
import { splitFullName } from "../dedup/normalize-name";
import type { ImportCandidateResult, ImportServices } from "../types";

function errorStack(error: Error): string | null {
  return error.stack ?? null;
}

/**
 * Process one candidate resume file (PDF or DOCX): extract its text, derive
 * identity fields via OpenAI (with a filename fallback), and create/update the
 * candidate. Shared by the ZIP loop and the single-document import so both
 * container shapes behave identically. `stepPrefix` scopes the log steps
 * (`zip.entry.*` vs `single.entry.*`).
 */
export async function processImportEntry(args: {
  importId: string;
  stepPrefix: string;
  fileType: ImportFileType;
  buffer: Uint8Array;
  fileName: string;
  sourcePath: string;
  rowIndex: number;
  positionId?: string | null;
  openaiApiKey?: string;
  services: ImportServices;
}): Promise<ImportCandidateResult> {
  const {
    importId,
    stepPrefix,
    fileType,
    buffer,
    fileName,
    sourcePath,
    rowIndex,
    positionId,
    openaiApiKey,
    services,
  } = args;

  const step = (suffix: string) => `${stepPrefix}.entry.${suffix}`;

  importLog("log", "Extracting text from document", {
    step: step("text_extract"),
    importId,
    fileType,
    rowIndex,
    fileName,
    bufferBytes: buffer.byteLength,
  });

  const resumeText = await extractDocumentText(buffer, fileName);

  importLog("log", "Text extracted", {
    step: step("text_done"),
    importId,
    fileType,
    rowIndex,
    fileName,
    textLength: resumeText.length,
  });

  let firstName = "Unknown";
  let lastName = "";
  let email = "";
  let phone: string | null = null;
  let location: string | null = null;
  let school: string | null = null;
  let major: string | null = null;
  let graduationYear: number | null = null;
  let linkedinUrl: string | null = null;

  if (openaiApiKey && resumeText.trim()) {
    importLog("log", "Calling OpenAI for resume fields", {
      step: step("openai_start"),
      importId,
      fileType,
      rowIndex,
      fileName,
    });

    const extracted = await extractResumeFieldsFromText(
      resumeText,
      openaiApiKey,
    );

    if (extracted) {
      if (extracted.firstName && extracted.firstName !== "Unknown") {
        firstName = extracted.firstName;
      }
      if (extracted.lastName) {
        lastName = extracted.lastName;
      }
      if (extracted.email) {
        email = extracted.email;
      }
      phone = extracted.phone ?? null;
      location = extracted.location ?? null;
      school = extracted.school ?? null;
      major = extracted.major ?? null;
      graduationYear = extracted.graduationYear ?? null;
      linkedinUrl = extracted.linkedinUrl ?? null;

      importLog("log", "OpenAI extraction succeeded", {
        step: step("openai_done"),
        importId,
        fileType,
        rowIndex,
        email,
        name: `${firstName} ${lastName}`.trim(),
      });
    } else {
      importLog("warn", "OpenAI extraction returned no fields", {
        step: step("openai_empty"),
        importId,
        fileType,
        rowIndex,
        fileName,
      });
    }
  } else if (!openaiApiKey) {
    importLog("warn", "Skipping OpenAI — no API key", {
      step: step("openai_skipped"),
      importId,
      fileType,
      rowIndex,
    });
  }

  if (!email) {
    const baseName = fileName.replace(/\.(pdf|docx)$/i, "");
    const split = splitFullName(baseName.replace(/[-_]/g, " "));
    firstName = split.firstName;
    lastName = split.lastName;
    email = `${baseName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || `candidate${rowIndex}`}@import.placeholder`;

    importLog("log", "Using filename fallback for identity", {
      step: step("filename_fallback"),
      importId,
      fileType,
      rowIndex,
      fileName,
      email,
    });
  }

  try {
    const result = await createCandidateFromImport(
      {
        firstName,
        lastName,
        email,
        phone,
        location,
        source: "import",
        profile: {
          school,
          major,
          graduationYear,
          linkedinUrl,
          resumeText: resumeText || null,
        },
        document: {
          buffer: buffer.slice(),
          fileName,
          category: "resume",
        },
        positionId: positionId ?? null,
        importId,
        rowIndex,
        duplicatePolicy: "update_resume",
        metadata: { sourceFile: sourcePath },
      },
      services,
    );

    importLog("log", "Entry finished", {
      step: step("done"),
      importId,
      fileType,
      rowIndex,
      path: sourcePath,
      status: result.status,
      candidateId: result.candidateId ?? null,
      error: result.error ?? null,
    });

    return result;
  } catch (error) {
    if (error instanceof ImportCancelledError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    importLog("error", "Entry failed", {
      step: step("error"),
      importId,
      fileType,
      rowIndex,
      path: sourcePath,
      error: message,
      stack: error instanceof Error ? errorStack(error) : null,
    });
    return { status: "failed", error: message };
  }
}
