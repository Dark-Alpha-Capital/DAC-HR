export type ImportFileType = "csv" | "zip" | "pdf";

export type ImportLogLevel = "log" | "warn" | "error";

export type ImportLogContext = {
  step: string;
  importId?: string;
  fileType?: ImportFileType;
  rowIndex?: number;
  [key: string]: unknown;
};

const VERBOSE_STEPS = new Set([
  "unified.start",
  "unified.dedup_check",
  "csv.row.start",
  "zip.pdf.start",
  "zip.pdf.text_extract",
  "zip.pdf.openai_start",
  "pdf.match.start",
  "pdf.match.write_chunk",
  "pdf.roster_extract_start",
]);

function shortId(id?: string): string {
  if (!id) return "";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function formatBytes(bytes: unknown): string | null {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pickIcon(
  level: ImportLogLevel,
  step: string,
  context: ImportLogContext,
): string {
  const status = context.status;

  if (level === "error" || status === "failed") return "❌";
  if (
    step.includes("duplicate_skipped") ||
    status === "skipped" ||
    step.includes("openai_skipped")
  ) {
    return "⏭️";
  }
  if (level === "warn" || step.includes("unmatched")) return "⚠️";

  if (
    step.endsWith(".complete") ||
    step.endsWith(".done") ||
    step === "workflow.complete" ||
    step === "unified.candidate_created" ||
    step === "unified.done" ||
    status === "created" ||
    status === "success"
  ) {
    return "✅";
  }

  if (
    step.includes("received") ||
    step.includes("workflow.start") ||
    step.endsWith(".start")
  ) {
    return "▶️";
  }

  if (
    step.includes("parsed") ||
    step.includes("extracted") ||
    step.includes("matched") ||
    step.includes("chunks")
  ) {
    return "📋";
  }

  if (step.includes("upload") || step.includes("nextcloud")) return "☁️";
  if (step.includes("openai")) return "🤖";
  if (step.includes("dispatch") || step.includes("workflow")) return "🔀";

  return "•";
}

function formatStepLabel(step: string): string {
  return step
    .replace(/\./g, " › ")
    .replace(/_/g, " ");
}

function buildDetailParts(
  context: ImportLogContext,
  message: string,
): string[] {
  const parts: string[] = [];

  if (context.fileType) {
    parts.push(String(context.fileType).toUpperCase());
  }

  if (context.filename) {
    parts.push(`"${context.filename}"`);
  }

  if (context.rowIndex != null) {
    parts.push(`row ${context.rowIndex}`);
  }

  if (context.name) {
    parts.push(String(context.name));
  }

  if (context.email) {
    parts.push(String(context.email));
  }

  if (context.status) {
    parts.push(`→ ${String(context.status)}`);
  }

  if (context.rowCount != null) {
    parts.push(`${context.rowCount} rows`);
  }

  if (context.pdfCount != null) {
    parts.push(`${context.pdfCount} PDFs`);
  }

  if (context.pageCount != null) {
    parts.push(`${context.pageCount} pages`);
  }

  if (context.matchedCount != null) {
    parts.push(`${context.matchedCount} matched`);
  }

  if (context.total != null && context.created != null) {
    parts.push(
      `${context.created} created · ${context.skipped ?? 0} skipped · ${context.failed ?? 0} failed`,
    );
  }

  const size =
    formatBytes(context.bufferBytes) ??
    formatBytes(context.contentLength) ??
    formatBytes(context.fileSize);
  if (size) {
    parts.push(size);
  }

  if (context.elapsedMs != null) {
    parts.push(`${context.elapsedMs}ms`);
  }

  if (context.error) {
    parts.push(String(context.error));
  }

  if (parts.length === 0 && message) {
    parts.push(message);
  }

  const importRef = shortId(context.importId);
  if (importRef) {
    parts.push(`#${importRef}`);
  }

  return parts;
}

function formatLine(
  level: ImportLogLevel,
  message: string,
  context: ImportLogContext,
): string {
  const { step } = context;
  const icon = pickIcon(level, step, context);
  const indent = VERBOSE_STEPS.has(step) ? "   " : "";
  const label = formatStepLabel(step);
  const details = buildDetailParts(context, message).join(" │ ");

  return `${indent}${icon}  ${label} │ ${details}`;
}

const PHASE_STARTS = new Set([
  "api.upload.received",
  "workflow.dispatch",
]);

export function importLog(
  level: ImportLogLevel,
  message: string,
  context: ImportLogContext,
) {
  if (PHASE_STARTS.has(context.step)) {
    console[level](`\n${"─".repeat(52)}`);
  }
  const line = formatLine(level, message, context);
  console[level](line);
}
