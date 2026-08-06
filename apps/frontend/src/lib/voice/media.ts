import { logInterview } from "~/lib/interview-debug-log";

/**
 * Media capture helpers for the voice interview client. Pure-ish: each helper
 * returns data (or throws) instead of managing its own state, so the hook stays
 * the only owner of media lifecycle.
 */

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream;
}

/** iOS Safari / older browsers lack screen capture entirely. */
export function supportsScreenCapture(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);
}

export interface MediaPreflight {
  mic: boolean;
  screenCapture: boolean;
  audioOnly: boolean;
}

export function preflightMedia(): MediaPreflight {
  const screenCapture = supportsScreenCapture();
  const audioOnly = !screenCapture || isIOSDevice();
  return { mic: true, screenCapture, audioOnly };
}

const RECORDING_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

const AUDIO_ONLY_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

export function getRecordingMimeType(audioOnly = false): string {
  const candidates = audioOnly
    ? AUDIO_ONLY_MIME_CANDIDATES
    : RECORDING_MIME_CANDIDATES;
  if (typeof MediaRecorder === "undefined") {
    return audioOnly ? "audio/webm" : "video/webm";
  }
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return audioOnly ? "audio/webm" : "video/webm";
}

export interface DisplayMediaOptions {
  audioOnly?: boolean;
}

/** Request screen capture, or null when audio-only mode is requested. */
export async function requestDisplayMedia(): Promise<MediaStream | null> {
  if (!supportsScreenCapture()) {
    return null;
  }

  const advanced: DisplayMediaStreamOptions = {
    video: {
      displaySurface: "browser",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    monitorTypeSurfaces: "exclude",
  } as DisplayMediaStreamOptions;

  try {
    return await navigator.mediaDevices.getDisplayMedia(advanced);
  } catch (error) {
    logInterview.warn("voice", "display_media_advanced_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  }
}

/** Request mic (+ camera unless audio-only). */
export async function requestUserMedia(
  audioOnly = false,
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(
    audioOnly
      ? { audio: true }
      : {
          audio: true,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
  );
}

/**
 * Merge screen audio + mic into one recording stream when screen capture is
 * available; otherwise record the mic alone (audio-only).
 */
export function buildRecordingStream(
  screenStream: MediaStream | null,
  micStream: MediaStream,
  audioContext: AudioContext | null,
): { stream: MediaStream; audioContext: AudioContext | null } {
  const videoTracks = screenStream?.getVideoTracks() ?? [];
  const micTracks = micStream.getAudioTracks();
  const screenAudioTracks = screenStream?.getAudioTracks() ?? [];

  if (!screenStream || screenAudioTracks.length === 0) {
    return {
      stream: new MediaStream([...videoTracks, ...micTracks]),
      audioContext,
    };
  }

  const context = audioContext ?? new AudioContext();
  const destination = context.createMediaStreamDestination();

  for (const track of [...screenAudioTracks, ...micTracks]) {
    context
      .createMediaStreamSource(new MediaStream([track]))
      .connect(destination);
  }

  return {
    stream: new MediaStream([
      ...videoTracks,
      ...destination.stream.getAudioTracks(),
    ]),
    audioContext: context,
  };
}

/** The mic-only audio stream sent to the Realtime API. */
export function getAudioOnlyStream(micStream: MediaStream): MediaStream {
  return new MediaStream(micStream.getAudioTracks());
}
