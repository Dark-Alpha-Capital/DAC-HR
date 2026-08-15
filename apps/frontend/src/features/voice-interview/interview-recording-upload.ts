import {
  buildNamedEntityFolderPath,
  formatPersonName,
  uploadFile as uploadToNextcloud,
} from "@workspace/nextcloud";
import { getServerNextcloudClient } from "#/lib/nextcloud-server";
import { interviewsService } from "#/features/interviews/server/interviews-service";

const ALLOWED_RECORDING_TYPES = [
  "video/webm",
  "video/mp4",
  "video/ogg",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
];

const MAX_RECORDING_SIZE_BYTES = 500 * 1024 * 1024;

export interface RecordingUploadOptions {
  /**
   * When provided (from the Cloudflare ExecutionContext), the Nextcloud upload
   * is scheduled as background work and the route returns immediately. Without
   * it the upload runs inline (fallback when no exec context is available).
   */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Handles the interview screen-recording upload (video + audio in one webm).
 *
 * The recording is captured in the browser and POSTed here. Because a large
 * video can't pass through a Workflow/Queue message (128KB queue limit, small
 * workflow params) and we intentionally don't stage in R2, the file bytes must
 * reach Cloudflare first. We then hand the Nextcloud upload to
 * `ctx.waitUntil()` so it runs in the background and continues even if the
 * candidate's tab moves on or closes — the interview flow never waits on it.
 */
export async function handleRecordingUpload(
  request: Request,
  token: string,
  options: RecordingUploadOptions = {},
): Promise<Response> {
  try {
    const formData = await request.formData();

    const sessionIdValue = formData.get("sessionId");
    const requestedSessionId =
      sessionIdValue === null || sessionIdValue instanceof File
        ? undefined
        : sessionIdValue;

    const validation = await interviewsService.assertRecordingUploadValid(
      token,
      requestedSessionId,
    );
    if (!validation.ok) {
      return Response.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof Blob) || fileEntry.size === 0) {
      return Response.json(
        { error: "No recording file provided" },
        { status: 400 },
      );
    }

    const fileName =
      fileEntry instanceof File && fileEntry.name
        ? fileEntry.name
        : "screen-recording.webm";

    const contentType =
      fileEntry.type ||
      (fileName.endsWith(".webm") ? "video/webm" : "application/octet-stream");

    if (!ALLOWED_RECORDING_TYPES.includes(contentType)) {
      return Response.json(
        { error: "Unsupported recording format" },
        { status: 400 },
      );
    }

    if (fileEntry.size > MAX_RECORDING_SIZE_BYTES) {
      return Response.json(
        { error: "Recording file exceeds 500MB limit" },
        { status: 400 },
      );
    }

    const sessionId = validation.session.id;
    const candidateName = formatPersonName(
      validation.row.candidate.firstName,
      validation.row.candidate.lastName,
    );
    const folderPath = buildNamedEntityFolderPath({
      root: "/ATS/interviews",
      name: candidateName,
      id: sessionId,
    });

    const runUpload = async (): Promise<void> => {
      const client = getServerNextcloudClient();
      const uploadResult = await uploadToNextcloud({
        client,
        file: fileEntry,
        folderPath,
        fileName: "screen-recording.webm",
      });

      if (!uploadResult.success || !uploadResult.downloadUrl) {
        console.error("Nextcloud upload failed for interview recording:", {
          code: uploadResult.code,
          error: uploadResult.error,
          sessionId,
        });
        return;
      }

      await interviewsService.updateSessionVoiceMetadata(sessionId, {
        sessionAudioUrl: uploadResult.downloadUrl,
        sessionAudioPath: uploadResult.filePath ?? null,
      });
    };

    if (options.waitUntil) {
      options.waitUntil(runUpload());
      return Response.json({ status: "uploading" });
    }

    await runUpload();
    return Response.json({ status: "uploaded" });
  } catch (error) {
    console.error("Error uploading interview recording:", error);
    return Response.json(
      { error: "Failed to upload session recording" },
      { status: 500 },
    );
  }
}
