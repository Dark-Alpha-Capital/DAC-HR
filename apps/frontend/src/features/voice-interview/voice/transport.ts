import { logInterview } from "#/features/voice-interview/interview-debug-log";

/**
 * WebRTC transport helpers for the Realtime API call. The hook owns the
 * RTCPeerConnection lifecycle; this module owns remote-audio wiring and ICE
 * failure recovery.
 */

export function attachRemoteAudio(
  pc: RTCPeerConnection,
  audioRef: { current: HTMLAudioElement | null },
): void {
  pc.ontrack = (event) => {
    let audio = audioRef.current;
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.style.display = "none";
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
    audio.srcObject = event.streams[0] ?? null;
    void audio.play().catch(() => undefined);
  };
}

/**
 * Watch the peer connection for transport failures and attempt a single ICE
 * restart. Returns a cleanup function.
 */
export function monitorPeerConnection(
  pc: RTCPeerConnection,
  onFailed?: () => void,
): () => void {
  let restarted = false;

  const onChange = () => {
    const state = pc.connectionState;
    logInterview.info("voice", "pc_connection_state", { state });
    if (state === "failed" && !restarted) {
      restarted = true;
      logInterview.info("voice", "ice_restart", {});
      try {
        void pc.restartIce();
      } catch (error) {
        logInterview.warn("voice", "ice_restart_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      onFailed?.();
    }
  };

  pc.addEventListener("connectionstatechange", onChange);
  return () => pc.removeEventListener("connectionstatechange", onChange);
}

/** Raise a callback when the media input device set changes (headset swap). */
export function watchDeviceChanges(onChange: () => void): () => void {
  const handler = () => {
    logInterview.info("voice", "device_change", {});
    onChange();
  };
  navigator.mediaDevices?.addEventListener?.("devicechange", handler);
  return () =>
    navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
}

export function createDataChannel(
  pc: RTCPeerConnection,
  onMessage: (event: MessageEvent) => void,
): RTCDataChannel {
  const channel = pc.createDataChannel("oai-events");
  channel.addEventListener("message", onMessage);
  return channel;
}
