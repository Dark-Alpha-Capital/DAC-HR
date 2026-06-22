"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { Mic, MicOff, Loader2, Lock, RefreshCw, Keyboard } from "lucide-react";
import { toast } from "sonner";

type RecorderState = "idle" | "recording" | "transcribing" | "done" | "failed";

const MAX_SECONDS = 60;

interface VoiceRecorderProps {
  token: string;
  disabled: boolean;
  onTranscript: (text: string) => void;
  onTypeInstead: () => void;
}

export default function VoiceRecorder({
  token,
  disabled,
  onTranscript,
  onTypeInstead,
}: VoiceRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [countdown, setCountdown] = useState(MAX_SECONDS);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Saved audio blob so "Retry Transcription" can re-send without re-recording
  const audioBlob = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Release mic track and clear interval on unmount (or question navigation)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, []);

  const sendAudio = useCallback(
    async (blob: Blob) => {
      setRecorderState("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch(`/api/interview-token/${token}/transcribe`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("non-ok");
        const { text } = (await res.json()) as { text: string };
        if (!text || text.trim().length === 0) throw new Error("empty");
        onTranscript(text.trim());
        setRecorderState("done");
      } catch {
        setRecorderState("failed");
      }
    },
    [token, onTranscript],
  );

  const stopRecordingAndSend = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // onstop (registered in startRecording below) calls sendAudio
      recorder.stop();
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    chunksRef.current = [];
    setCountdown(MAX_SECONDS);

    // Step 1: request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Microphone access denied. Please allow microphone access and try again.",
      );
      return;
    }
    streamRef.current = stream;

    // Step 2: pick best supported audio format
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";

    // Step 3: create MediaRecorder wrapping the live mic stream
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      toast.error("Your browser does not support audio recording.");
      for (const t of stream.getTracks()) t.stop();
      return;
    }
    mediaRecorderRef.current = recorder;

    // Step 4: collect encoded audio chunks every 250ms
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    // Step 5: when recording stops, assemble chunks into one Blob and send
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      audioBlob.current = blob; // saved for potential retry
      void sendAudio(blob);
    };

    recorder.start(250);
    setRecorderState("recording");

    // Step 6: auto-stop countdown — triggers stopRecordingAndSend at 0
    let remaining = MAX_SECONDS;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) stopRecordingAndSend();
    }, 1000);
  }, [disabled, sendAudio, stopRecordingAndSend]);

  const handleRetry = useCallback(() => {
    if (audioBlob.current) void sendAudio(audioBlob.current);
  }, [sendAudio]);

  const handleTypeInstead = useCallback(() => {
    setRecorderState("idle");
    setCountdown(MAX_SECONDS);
    audioBlob.current = null;
    onTypeInstead(); // parent re-enables the textarea and clears voice lock
  }, [onTypeInstead]);

  // --- Render ---

  if (recorderState === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-900 dark:bg-green-950">
        <Lock className="size-4 shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-green-700 dark:text-green-300">
          Voice response recorded — answer is locked.
        </span>
      </div>
    );
  }

  if (recorderState === "failed") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-3">
        <p className="text-sm text-destructive">
          Transcription failed. Retry with the same recording or switch to typing.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Retry Transcription
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTypeInstead}
            className="gap-1.5"
          >
            <Keyboard className="size-3.5" />
            Type Instead
          </Button>
        </div>
      </div>
    );
  }

  if (recorderState === "transcribing") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin shrink-0" />
        Transcribing your response…
      </div>
    );
  }

  if (recorderState === "recording") {
    const pct = (countdown / MAX_SECONDS) * 100;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pulsing red dot */}
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Recording…
            </span>
          </div>
          <span className="text-sm font-mono tabular-nums text-red-600 dark:text-red-400">
            {countdown}s remaining
          </span>
        </div>
        {/* Shrinking progress bar shows time running out */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={stopRecordingAndSend}
          className="w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
        >
          <MicOff className="mr-1.5 size-4" />
          Stop Recording
        </Button>
      </div>
    );
  }

  // idle — default state
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startRecording}
      disabled={disabled}
      className="gap-1.5"
    >
      <Mic className="size-4" />
      Use Voice Dictation
    </Button>
  );
}
