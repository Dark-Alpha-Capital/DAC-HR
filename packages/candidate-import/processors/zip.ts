import JSZip from "jszip";
import { importLog } from "../logger";
import { ImportCancelledError, throwIfImportCancelled } from "../cancellation";
import { extractDocumentText } from "../pdf/extract-text";
import { createCandidateFromImport } from "../unified/create-candidate-from-import";
import { extractResumeFieldsFromText } from "../parsers/extract-resume-fields";
import { splitFullName } from "../dedup/normalize-name";
import type { ImportServices, ProcessImportResult } from "../types";

export async function processZipImport(args: {
  importId: string;
  buffer: Uint8Array;
  positionId?: string | null;
  openaiApiKey?: string;
  services: ImportServices;
}): Promise<ProcessImportResult> {
  const { importId } = args;
  const fileType = "zip" as const;

  importLog("log", "ZIP import started", {
    step: "zip.start",
    importId,
    fileType,
    positionId: args.positionId ?? null,
    bufferBytes: args.buffer.byteLength,
    hasOpenAI: Boolean(args.openaiApiKey),
  });

  const zip = await JSZip.loadAsync(args.buffer);
  const pdfEntries = Object.entries(zip.files).filter(
    ([path, file]) => !file.dir && path.toLowerCase().endsWith(".pdf"),
  );

  importLog("log", "ZIP extracted", {
    step: "zip.extracted",
    importId,
    fileType,
    totalEntries: Object.keys(zip.files).length,
    pdfCount: pdfEntries.length,
    pdfPaths: pdfEntries.map(([path]) => path),
  });

  if (args.services.updateImportProgress) {
    await args.services.updateImportProgress({
      importId: args.importId,
      totalCandidates: pdfEntries.length,
    });
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < pdfEntries.length; i++) {
    await throwIfImportCancelled(importId, {
      total: pdfEntries.length,
      created,
      skipped,
      failed,
    });

    const [path, file] = pdfEntries[i]!;
    const rowIndex = i + 1;

    importLog("log", "Processing ZIP PDF entry", {
      step: "zip.pdf.start",
      importId,
      fileType,
      rowIndex,
      totalPdfs: pdfEntries.length,
      path,
    });

    try {
      const fileBuffer = await file.async("uint8array");
      const fileName = path.split("/").pop() ?? `resume-${rowIndex}.pdf`;
      const documentBuffer = fileBuffer.slice();

      importLog("log", "Extracting text from PDF", {
        step: "zip.pdf.text_extract",
        importId,
        fileType,
        rowIndex,
        fileName,
        bufferBytes: fileBuffer.byteLength,
      });

      const resumeText = await extractDocumentText(fileBuffer, fileName);

      importLog("log", "PDF text extracted", {
        step: "zip.pdf.text_done",
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

      if (args.openaiApiKey && resumeText.trim()) {
        importLog("log", "Calling OpenAI for resume fields", {
          step: "zip.pdf.openai_start",
          importId,
          fileType,
          rowIndex,
          fileName,
        });

        const extracted = await extractResumeFieldsFromText(
          resumeText,
          args.openaiApiKey,
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
            step: "zip.pdf.openai_done",
            importId,
            fileType,
            rowIndex,
            email,
            name: `${firstName} ${lastName}`.trim(),
          });
        } else {
          importLog("warn", "OpenAI extraction returned no fields", {
            step: "zip.pdf.openai_empty",
            importId,
            fileType,
            rowIndex,
            fileName,
          });
        }
      } else if (!args.openaiApiKey) {
        importLog("warn", "Skipping OpenAI — no API key", {
          step: "zip.pdf.openai_skipped",
          importId,
          fileType,
          rowIndex,
        });
      }

      if (!email) {
        const baseName = fileName.replace(/\.pdf$/i, "");
        const split = splitFullName(baseName.replace(/[-_]/g, " "));
        firstName = split.firstName;
        lastName = split.lastName;
        email = `${baseName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || `candidate${rowIndex}`}@import.placeholder`;

        importLog("log", "Using filename fallback for identity", {
          step: "zip.pdf.filename_fallback",
          importId,
          fileType,
          rowIndex,
          fileName,
          email,
        });
      }

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
            buffer: documentBuffer,
            fileName,
            category: "resume",
          },
          positionId: args.positionId,
          importId: args.importId,
          rowIndex,
          duplicatePolicy: "skip",
          metadata: { sourceFile: path },
        },
        args.services,
      );

      if (result.status === "created") created++;
      else if (result.status === "skipped") skipped++;
      else failed++;

      if (args.services.updateImportProgress) {
        await args.services.updateImportProgress({
          importId: args.importId,
          processedCandidates: created + skipped + failed,
        });
      }

      importLog("log", "ZIP PDF entry finished", {
        step: "zip.pdf.done",
        importId,
        fileType,
        rowIndex,
        path,
        status: result.status,
        candidateId: result.candidateId ?? null,
        error: result.error ?? null,
      });
    } catch (error) {
      if (error instanceof ImportCancelledError) {
        throw error;
      }
      failed++;
      importLog("error", "ZIP PDF entry failed", {
        step: "zip.pdf.error",
        importId,
        fileType,
        rowIndex,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = {
    total: pdfEntries.length,
    created,
    skipped,
    failed,
  };

  importLog("log", "ZIP import completed", {
    step: "zip.complete",
    importId,
    fileType,
    ...summary,
  });

  return summary;
}
