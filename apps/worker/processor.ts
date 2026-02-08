import { Job } from "bullmq";
import { db, eq } from "@workspace/db";
import {
  candidate,
  application,
  candidatePosition,
  candidateDocument,
} from "@workspace/db/schema";
import {
  getBulkResumeBatchById,
  updateBulkResumeJobStatus,
  incrementBulkResumeBatchCounts,
  insertAuditLog,
} from "@workspace/db/queries";
import { getFileContents, uploadToNextcloud } from "./nextcloud";
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME =
  process.env.CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME ||
  "fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi";

const EXTRACTION_PROMPT = `Extract candidate information from this resume. Return a single JSON object with only these keys (use null for missing): firstName (string), lastName (string), email (string, required - infer if not explicit), phone (string or null), location (string or null), source (string or null), sourceUrl (string or null), note (string or null). No other text, only the JSON object.`;

type ExtractedCandidate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
};

function parseExtraction(text: string): ExtractedCandidate | null {
  try {
    const jsonStr = text.replace(/^[\s\S]*?\{/, "{").replace(/\}[\s\S]*$/, "}");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const firstName = String(parsed.firstName ?? "").trim();
    const lastName = String(parsed.lastName ?? "").trim();
    const email = String(parsed.email ?? "").trim();
    if (!firstName || !lastName || !email) return null;
    return {
      firstName,
      lastName,
      email,
      phone: parsed.phone != null ? String(parsed.phone).trim() || null : null,
      location:
        parsed.location != null ? String(parsed.location).trim() || null : null,
      source:
        parsed.source != null ? String(parsed.source).trim() || null : null,
      sourceUrl:
        parsed.sourceUrl != null
          ? String(parsed.sourceUrl).trim() || null
          : null,
      note:
        parsed.note != null ? String(parsed.note).trim() || null : null,
    };
  } catch {
    return null;
  }
}

export type BulkResumeJobPayload = {
  batchId: string;
  jobId: string;
  stagingPath: string;
  fileName: string;
  positionId?: string;
  userId: string;
};

export async function processBulkResumeJob(
  job: Job<BulkResumeJobPayload, void>,
): Promise<void> {
  const { batchId, jobId, stagingPath, fileName, positionId, userId } =
    job.data;

  await updateBulkResumeJobStatus(jobId, { status: "processing" });

  let buffer: Buffer | null = null;
  let tmpPath: string | null = null;

  try {
    buffer = await getFileContents(stagingPath);
    if (!buffer || buffer.length === 0) {
      throw new Error("Failed to read file from staging");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenAI({ apiKey });
    const dir = mkdtempSync(join(tmpdir(), "bulk-resume-"));
    tmpPath = join(dir, fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
    writeFileSync(tmpPath, buffer);

    const mimeType = fileName.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : fileName.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/msword";

    const uploaded = await genAI.files.upload({
      file: tmpPath,
      config: { mimeType },
    });
    const fileUri = (uploaded as { uri?: string; name?: string }).uri ?? (uploaded as { uri?: string; name?: string }).name;
    if (!fileUri) throw new Error("Gemini file upload failed");

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri, mimeType } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const raw = (response as { text?: string }).text;
    let text = "";
    if (typeof raw === "string") {
      text = raw.trim();
    } else {
      const cand = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } } }).candidates?.[0];
      text = cand?.content?.parts?.[0]?.text?.trim() ?? "";
    }
    if (tmpPath) {
      try {
        unlinkSync(tmpPath);
      } catch {}
    }
    tmpPath = null;

    const extracted = parseExtraction(text);
    if (!extracted) {
      throw new Error("Could not extract valid candidate data from resume");
    }

    const existing = await db
      .select({ id: candidate.id })
      .from(candidate)
      .where(eq(candidate.email, extracted.email))
      .limit(1);
    if (existing.length > 0) {
      throw new Error("Email already exists in database");
    }

    const [newCandidate] = await db
      .insert(candidate)
      .values({
        firstName: extracted.firstName,
        lastName: extracted.lastName,
        email: extracted.email,
        phone: extracted.phone,
        location: extracted.location,
        source: extracted.source,
        sourceUrl: extracted.sourceUrl,
        note: extracted.note,
      })
      .returning();

    if (!newCandidate) throw new Error("Failed to create candidate");

    if (positionId?.trim()) {
      await db.insert(application).values({
        candidateId: newCandidate.id,
        positionId: positionId.trim(),
        status: "ai_screening",
      });
      await db.insert(candidatePosition).values({
        candidateId: newCandidate.id,
        positionId: positionId.trim(),
      });
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalUrl = await uploadToNextcloud(
      buffer,
      "/Candidates",
      sanitized || `resume-${Date.now()}.pdf`,
    );
    if (!finalUrl) throw new Error("Failed to upload resume to Nextcloud");

    const [doc] = await db
      .insert(candidateDocument)
      .values({
        candidateId: newCandidate.id,
        name: fileName,
        description: "Resume from bulk upload",
        category: "resume",
        url: finalUrl,
        fileSearchDocumentName: null,
      })
      .returning();

    if (
      CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME &&
      doc &&
      process.env.GEMINI_API_KEY
    ) {
      try {
        const customMetadata = [
          { key: "candidate_id", stringValue: newCandidate.id },
          {
            key: "candidate_full_name",
            stringValue: `${newCandidate.firstName} ${newCandidate.lastName}`,
          },
          { key: "candidate_email", stringValue: newCandidate.email },
        ];
        if (newCandidate.location) {
          customMetadata.push({
            key: "candidate_location",
            stringValue: newCandidate.location,
          });
        }

        const blob = new Blob([buffer], { type: "application/pdf" });
        let op = await genAI.fileSearchStores.uploadToFileSearchStore({
          file: blob,
          fileSearchStoreName: CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
          config: {
            displayName: fileName,
            customMetadata,
          },
        });
        let waited = 0;
        while (!op.done && waited < 120) {
          await new Promise((r) => setTimeout(r, 5000));
          op = await genAI.operations.get({ operation: op });
          waited++;
        }
        const docName = op.response?.documentName ?? null;
        if (docName && doc) {
          await db
            .update(candidateDocument)
            .set({ fileSearchDocumentName: docName })
            .where(eq(candidateDocument.id, doc.id));
        }
      } catch (err) {
        console.error("[worker] File search indexing error:", err);
      }
    }

    await updateBulkResumeJobStatus(jobId, {
      status: "completed",
      candidateId: newCandidate.id,
    });
    await incrementBulkResumeBatchCounts(batchId, "completed");

    await insertAuditLog({
      userId,
      action: "bulk_resume_create_candidate",
      entityType: "candidate",
      entityId: newCandidate.id,
      details: {
        batchId,
        jobId,
        fileName,
        candidate: {
          id: newCandidate.id,
          email: newCandidate.email,
          firstName: newCandidate.firstName,
          lastName: newCandidate.lastName,
        },
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    await updateBulkResumeJobStatus(jobId, {
      status: "failed",
      errorMessage: message,
    });
    await incrementBulkResumeBatchCounts(batchId, "failed");
    if (tmpPath) {
      try {
        unlinkSync(tmpPath);
      } catch {}
    }
    throw err;
  }
}
