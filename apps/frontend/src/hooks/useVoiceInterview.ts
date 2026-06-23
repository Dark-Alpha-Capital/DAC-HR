import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceInterviewPhase } from "@workspace/interview-realtime/types";
import type { CheatingEventType } from "@workspace/db/enums";
import { useCheatingPrevention } from "./useCheatingPrevention";

export interface VoiceQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds?: number | null;
  options?: Array<{ id: string; text: string }> | null;
}

interface StartVoiceResponse {
  clientSecret: string;
  sessionId: string;
  wsUrl: string;
  model: string;
  questions: VoiceQuestion[];
}

export interface VoiceInterviewState {
  status: "idle" | "connecting" | "active" | "completed" | "error";
  isEnding: boolean;
  currentQuestionIndex: number;
  voicePhase: VoiceInterviewPhase;
  questions: VoiceQuestion[];
  displayQuestion: VoiceQuestion | null;
  transcripts: Array<{ role: "user" | "assistant"; text: string }>;
  liveUserTranscript: string;
  liveAssistantTranscript: string;
  allQuestionsAsked: boolean;
  introActive: boolean;
  error?: string;
}

const LIVE_TRANSCRIPT_FLUSH_MS = 1000;
const VOICE_TRANSCRIPT_LOG_TOPIC = "voice-transcript";

function logVoiceTranscript(
  action: string,
  data: Record<string, unknown> = {},
): void {
  console.info(
    `[${VOICE_TRANSCRIPT_LOG_TOPIC}] ${action}`,
    JSON.stringify(data),
  );
}

function previewTranscriptText(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

function mapConversationHistory(
  history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
): Array<{ role: "user" | "assistant"; text: string }> {
  if (!history?.length) {
    return [];
  }

  return history.map((entry) => ({
    role: entry.role,
    text: entry.content,
  }));
}

function resolveQuestionForIndex(
  questions: VoiceQuestion[],
  index: number,
  fallback?: VoiceQuestion | null,
): VoiceQuestion | null {
  return questions[index] ?? fallback ?? null;
}

function isQuestionPhase(phase: VoiceInterviewPhase) {
  return (
    phase === "questions" || phase === "closing" || phase === "awaiting_end"
  );
}

function mergeQuestion(
  questions: VoiceQuestion[],
  question: VoiceQuestion,
): VoiceQuestion[] {
  const existingIndex = questions.findIndex((item) => item.id === question.id);
  if (existingIndex >= 0) {
    const next = [...questions];
    next[existingIndex] = { ...next[existingIndex], ...question };
    return next;
  }
  return [...questions, question];
}

function getRecordingMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return "video/webm";
}

function buildRecordingStream(
  screenStream: MediaStream,
  micStream: MediaStream,
  audioContext: AudioContext | null,
): { stream: MediaStream; audioContext: AudioContext | null } {
  const videoTracks = screenStream.getVideoTracks();
  const micTracks = micStream.getAudioTracks();
  const screenAudioTracks = screenStream.getAudioTracks();

  if (screenAudioTracks.length === 0) {
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

function stopMediaRecorder(recorder: MediaRecorder): Promise<void> {
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

export function useVoiceInterview(token: string) {
  const [state, setState] = useState<VoiceInterviewState>({
    status: "idle",
    isEnding: false,
    currentQuestionIndex: 0,
    voicePhase: "intro",
    questions: [],
    displayQuestion: null,
    transcripts: [],
    liveUserTranscript: "",
    liveAssistantTranscript: "",
    allQuestionsAsked: false,
    introActive: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingMimeTypeRef = useRef("video/webm");
  const endInterviewResolveRef = useRef<(() => void) | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveTranscriptBuffersRef = useRef({ user: "", assistant: "" });

  const completeSessionViaApi = useCallback(async () => {
    const response = await fetch(`/api/interview-token/${token}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabSwitches: 0 }),
    });

    if (!response.ok) {
      throw new Error("Failed to complete interview session");
    }
  }, [token]);

  const sendToDO = useCallback(
    (eventType: CheatingEventType, metadata?: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      ws.send(JSON.stringify({ type: "CHEATING_EVENT", eventType, metadata }));
    },
    [],
  );

  useCheatingPrevention(sendToDO, state.status === "active");

  useEffect(() => {
    if (state.status !== "active" && state.status !== "connecting") {
      return;
    }

    const flushLiveTranscripts = () => {
      const { user, assistant } = liveTranscriptBuffersRef.current;
      if (user || assistant) {
        logVoiceTranscript("live_flush", {
          userLength: user.length,
          assistantLength: assistant.length,
          userPreview: user ? previewTranscriptText(user, 80) : undefined,
          assistantPreview: assistant
            ? previewTranscriptText(assistant, 80)
            : undefined,
        });
      }

      setState((current) => {
        if (
          current.liveUserTranscript === user &&
          current.liveAssistantTranscript === assistant
        ) {
          return current;
        }

        return {
          ...current,
          liveUserTranscript: user,
          liveAssistantTranscript: assistant,
        };
      });
    };

    flushLiveTranscripts();
    const intervalId = window.setInterval(
      flushLiveTranscripts,
      LIVE_TRANSCRIPT_FLUSH_MS,
    );
    return () => window.clearInterval(intervalId);
  }, [state.status]);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    remoteAudioRef.current?.remove();
    remoteAudioRef.current = null;
    liveTranscriptBuffersRef.current = { user: "", assistant: "" };
  }, []);

  const uploadRecording = useCallback(async () => {
    if (chunksRef.current.length === 0) {
      throw new Error("No recording data captured");
    }

    const mimeType = recordingMimeTypeRef.current.split(";")[0] ?? "video/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const file = new File([blob], "screen-recording.webm", { type: mimeType });
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/interview-token/${token}/upload-audio`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error || "Failed to upload screen recording");
    }
  }, [token]);

  const endInterview = useCallback(async () => {
    setState((current) => ({ ...current, isEnding: true }));

    try {
      if (mediaRecorderRef.current?.state === "recording") {
        await stopMediaRecorder(mediaRecorderRef.current);
      }

      await uploadRecording();

      const ws = wsRef.current;
      let completedViaWs = false;

      if (ws?.readyState === WebSocket.OPEN) {
        const completedPromise = new Promise<void>((resolve) => {
          endInterviewResolveRef.current = () => {
            completedViaWs = true;
            resolve();
          };
          window.setTimeout(resolve, 12000);
        });

        ws.send(JSON.stringify({ type: "END_INTERVIEW" }));
        await completedPromise;
      }

      if (!completedViaWs) {
        await completeSessionViaApi();
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        isEnding: false,
        error:
          error instanceof Error ? error.message : "Failed to end interview",
      }));
      return;
    } finally {
      endInterviewResolveRef.current = null;
      cleanup();
    }

    setState((current) => ({
      ...current,
      status: "completed",
      isEnding: false,
    }));
  }, [cleanup, completeSessionViaApi, uploadRecording]);

  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      const message = JSON.parse(String(event.data)) as Record<string, unknown>;
      const type = typeof message.type === "string" ? message.type : "";

      if (
        type === "TRANSCRIPT" ||
        type === "TRANSCRIPT_DELTA" ||
        type === "CONNECTED" ||
        type === "INTRO_STARTED" ||
        type === "QUESTION_CHANGED"
      ) {
        logVoiceTranscript("ws_message", {
          type,
          role: message.role,
          textPreview:
            typeof message.text === "string"
              ? previewTranscriptText(message.text, 80)
              : undefined,
          deltaPreview:
            typeof message.delta === "string"
              ? previewTranscriptText(message.delta, 40)
              : undefined,
          historyLength: Array.isArray(
            (message.state as { conversationHistory?: unknown[] } | undefined)
              ?.conversationHistory,
          )
            ? (
                message.state as {
                  conversationHistory: unknown[];
                }
              ).conversationHistory.length
            : undefined,
        });
      }

      if (type === "CONNECTED") {
        const connectedState = message.state as
          | {
              currentQuestionIndex?: number;
              voicePhase?: VoiceInterviewPhase;
              questions?: VoiceQuestion[];
              conversationHistory?: Array<{
                role: "user" | "assistant";
                content: string;
              }>;
            }
          | undefined;

        const index = connectedState?.currentQuestionIndex ?? 0;
        const voicePhase = connectedState?.voicePhase ?? "intro";
        const questions = connectedState?.questions?.length
          ? connectedState.questions
          : undefined;
        const transcripts = mapConversationHistory(
          connectedState?.conversationHistory,
        );

        setState((current) => {
          const mergedQuestions = questions ?? current.questions;
          const displayQuestion = isQuestionPhase(voicePhase)
            ? resolveQuestionForIndex(mergedQuestions, index)
            : null;

          return {
            ...current,
            status: "active",
            currentQuestionIndex: index,
            voicePhase,
            introActive: voicePhase === "intro" || voicePhase === "awaiting_ready",
            questions: mergedQuestions,
            displayQuestion,
            transcripts,
            liveUserTranscript: "",
            liveAssistantTranscript: "",
          };
        });
        liveTranscriptBuffersRef.current = { user: "", assistant: "" };
      }

      if (type === "INTRO_STARTED") {
        setState((current) => ({
          ...current,
          voicePhase: "intro",
          introActive: true,
          displayQuestion: null,
        }));
      }

      if (type === "QUESTION_CHANGED" && typeof message.index === "number") {
        const question = message.question as VoiceQuestion | undefined;
        const index = message.index as number;

        setState((current) => {
          const mergedQuestions = question
            ? mergeQuestion(current.questions, question)
            : current.questions;
          const resolvedQuestion = resolveQuestionForIndex(
            mergedQuestions,
            index,
            question ?? current.displayQuestion,
          );

          return {
            ...current,
            voicePhase: current.allQuestionsAsked ? current.voicePhase : "questions",
            introActive: false,
            currentQuestionIndex: index,
            displayQuestion: resolvedQuestion,
            questions: mergedQuestions,
          };
        });
      }

      if (type === "ALL_QUESTIONS_ASKED") {
        setState((current) => ({
          ...current,
          voicePhase: "awaiting_end",
          allQuestionsAsked: true,
          introActive: false,
        }));
      }

      if (
        type === "TRANSCRIPT_DELTA" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.delta === "string"
      ) {
        const role = message.role as "user" | "assistant";
        liveTranscriptBuffersRef.current[role] += message.delta;
        logVoiceTranscript("transcript_delta_buffered", {
          role,
          deltaLength: message.delta.length,
          bufferLength: liveTranscriptBuffersRef.current[role].length,
        });
        return;
      }

      if (
        type === "TRANSCRIPT" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string"
      ) {
        const role = message.role as "user" | "assistant";
        liveTranscriptBuffersRef.current[role] = "";

        setState((current) => {
          const nextTranscripts = [
            ...current.transcripts,
            { role, text: message.text as string },
          ];
          logVoiceTranscript("transcript_committed", {
            role,
            textPreview: previewTranscriptText(message.text as string),
            transcriptCount: nextTranscripts.length,
          });
          return {
            ...current,
            liveUserTranscript: role === "user" ? "" : current.liveUserTranscript,
            liveAssistantTranscript:
              role === "assistant" ? "" : current.liveAssistantTranscript,
            transcripts: nextTranscripts,
          };
        });
        return;
      }

      if (type === "INTERVIEW_COMPLETED") {
        endInterviewResolveRef.current?.();
        setState((current) => ({ ...current, status: "completed" }));
      }

      if (type === "ERROR" && typeof message.message === "string") {
        setState((current) => ({
          ...current,
          status: "error",
          error: message.message as string,
        }));
      }
    },
    [],
  );

  const start = useCallback(async () => {
    liveTranscriptBuffersRef.current = { user: "", assistant: "" };
    setState({
      status: "connecting",
      isEnding: false,
      currentQuestionIndex: 0,
      voicePhase: "intro",
      questions: [],
      displayQuestion: null,
      transcripts: [],
      liveUserTranscript: "",
      liveAssistantTranscript: "",
      allQuestionsAsked: false,
      introActive: false,
    });

    try {
      await document.documentElement.requestFullscreen().catch(() => undefined);

      const startRes = await fetch(`/api/interview-token/${token}/start-voice`, {
        method: "POST",
      });

      if (!startRes.ok) {
        const body = (await startRes.json()) as { error?: string };
        throw new Error(body.error || "Failed to start voice session");
      }

      const config = (await startRes.json()) as StartVoiceResponse;

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
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
      } as DisplayMediaStreamOptions);
      screenStreamRef.current = screenStream;

      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrack?.addEventListener("ended", () => {
        sendToDO("WINDOW_BLUR", { reason: "screen_share_stopped" });
        if (mediaRecorderRef.current?.state === "recording") {
          void stopMediaRecorder(mediaRecorderRef.current);
        }
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const { stream: recordingStream, audioContext } = buildRecordingStream(
        screenStream,
        stream,
        audioContextRef.current,
      );
      audioContextRef.current = audioContext;

      const mimeType = getRecordingMimeType();
      recordingMimeTypeRef.current = mimeType;

      const audioStream = new MediaStream(stream.getAudioTracks());
      chunksRef.current = [];
      const recorder = new MediaRecorder(recordingStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;
      ws.onmessage = handleWsMessage;

      ws.onopen = () => {
        logVoiceTranscript("ws_open", { wsUrl: config.wsUrl });
        ws.send(JSON.stringify({ type: "PING" }));
        ws.send(
          JSON.stringify({
            type: "FULLSCREEN_STATE",
            isFullscreen: Boolean(document.fullscreenElement),
          }),
        );
      };

      ws.onerror = () => {
        logVoiceTranscript("ws_error", { wsUrl: config.wsUrl });
      };

      ws.onclose = (closeEvent) => {
        logVoiceTranscript("ws_close", {
          code: closeEvent.code,
          reason: closeEvent.reason,
          wasClean: closeEvent.wasClean,
        });
      };

      logVoiceTranscript("ws_connecting", {
        wsUrl: config.wsUrl,
        questionCount: config.questions.length,
      });

      setState((current) => ({
        ...current,
        questions: config.questions,
      }));

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      audioStream.getTracks().forEach((track) => pc.addTrack(track, audioStream));

      pc.ontrack = (event) => {
        let audio = remoteAudioRef.current;
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audio.setAttribute("playsinline", "");
          audio.style.display = "none";
          document.body.appendChild(audio);
          remoteAudioRef.current = audio;
        }
        audio.srcObject = event.streams[0] ?? null;
        void audio.play().catch(() => undefined);
      };

      const oaiEvents = pc.createDataChannel("oai-events");
      oaiEvents.addEventListener("message", (event) => {
        const ws = wsRef.current;
        if (ws?.readyState !== WebSocket.OPEN) {
          return;
        }
        ws.send(
          JSON.stringify({
            type: "REALTIME_EVENT",
            event: event.data,
          }),
        );
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${config.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error("Failed to establish realtime audio connection");
      }

      const answerSdp = await sdpResponse.text();
      const location = sdpResponse.headers.get("Location");
      const callId =
        location?.split("/").pop()?.trim() ??
        sdpResponse.headers.get("x-openai-call-id")?.trim() ??
        "";

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      if (callId) {
        const sendCallStarted = () => {
          if (ws.readyState === WebSocket.OPEN) {
            logVoiceTranscript("call_started_sent", {
              callId,
              location,
              clientSecretPrefix: config.clientSecret.slice(0, 8),
            });
            ws.send(
              JSON.stringify({
                type: "CALL_STARTED",
                callId,
                clientSecret: config.clientSecret,
              }),
            );
          } else {
            logVoiceTranscript("call_started_not_sent_ws_not_open", {
              callId,
              readyState: ws.readyState,
            });
          }
        };

        if (ws.readyState === WebSocket.OPEN) {
          sendCallStarted();
        } else {
          ws.addEventListener("open", sendCallStarted, { once: true });
        }
      } else {
        logVoiceTranscript("call_started_missing_call_id", {
          headerCallId: sdpResponse.headers.get("x-openai-call-id"),
          location: sdpResponse.headers.get("Location"),
        });
      }

      setState((current) => ({ ...current, status: "active" }));
    } catch (error) {
      cleanup();
      setState({
        status: "error",
        isEnding: false,
        currentQuestionIndex: 0,
        voicePhase: "intro",
        questions: [],
        displayQuestion: null,
        transcripts: [],
        liveUserTranscript: "",
        liveAssistantTranscript: "",
        allQuestionsAsked: false,
        introActive: false,
        error: error instanceof Error ? error.message : "Voice interview failed",
      });
    }
  }, [cleanup, handleWsMessage, sendToDO, token]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    start,
    endInterview,
    sendToDO,
    videoStreamRef: streamRef,
  };
}
