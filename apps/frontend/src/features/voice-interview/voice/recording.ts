import { logInterview } from "#/features/voice-interview/interview-debug-log";

/**
 * Screen-recording capture + upload for the voice interview. The hook owns the
 * recorder lifecycle; this module owns how chunks become a file and how the
 * upload is retried.
 */

export function stopMediaRecorder(recorder: MediaRecorder): Promise<void> {
  return new Promise((resolve) => {
    if (recorder.state === "inactive") {
      resolve();
      return;
    }

    recorder.addEventListener("stop", () => resolve(), { once: true });
    if (recorder.state === "recording") {
      recorder.requestData();
    }
    recorder.stop();
  });
}

export function createMediaRecorder(
  stream: MediaStream,
  mimeType: string,
  onData: (event: BlobEvent) => void,
  timesliceMs = 1000,
): MediaRecorder {
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (error) {
    logInterview.warn("voice", "media_recorder_mime_fallback", {
      mimeType,
      error: error instanceof Error ? error.message : String(error),
    });
    recorder = new MediaRecorder(stream);
  }
  recorder.ondataavailable = onData;
  recorder.start(timesliceMs);
  return recorder;
}

function toFile(chunks: Blob[], mimeType: string, fileName: string): File {
  const resolvedMime = mimeType.split(";")[0] ?? mimeType;
  const blob = new Blob(chunks, { type: resolvedMime });
  return new File([blob], fileName, { type: resolvedMime });
}

/**
 * Upload the recording to Nextcloud with one retry. Throws if both attempts
 * fail so the caller can surface the error.
 *
 * The `sessionId` names the session this recording belongs to. The server
 * resolves the bundle by token and attaches the recording to that exact
 * session — the interview may have already advanced to the next round, so the
 * "active" round would be the wrong one.
 */
export async function uploadRecording(
  token: string,
  chunks: Blob[],
  mimeType: string,
  sessionId?: string | null,
): Promise<void> {
  if (chunks.length === 0) {
    throw new Error("No recording data captured");
  }

  const file = toFile(chunks, mimeType, "screen-recording.webm");

  const attempt = async (): Promise<boolean> => {
    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) {
      formData.append("sessionId", sessionId);
    }
    const response = await fetch(`/api/interview-token/${token}/upload-audio`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      // SAFETY: the upload-audio API returns `{ error: string }` on failure;
      // JSON parse may return null, which the optional chain handles.
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      logInterview.warn("voice", "upload_audio_failed", {
        token,
        status: response.status,
        error: body?.error ?? "unknown",
      });
      return false;
    }
    return true;
  };

  if (await attempt()) {
    return;
  }

  if (!(await attempt())) {
    throw new Error("Failed to upload screen recording");
  }
}
