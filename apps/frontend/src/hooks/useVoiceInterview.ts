import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InterviewQuestion,
  VoiceInterviewPhase,
} from "@workspace/interview-realtime/types";
import { parseDoMessage, sendDoMessage } from "@workspace/interview-realtime/events";
import { formatRealtimeCallsError } from "@workspace/ai-config";
import type { CheatingEventType } from "@workspace/db/enums";
import { useCheatingPrevention } from "./useCheatingPrevention";
import { logInterview, truncateId } from "~/lib/interview-debug-log";

interface StartVoiceResponse {
  clientSecret: string;
  sessionId: string;
  wsUrl: string;
  model: string;
  questions: InterviewQuestion[];
  isPractice?: boolean;
}

export interface VoiceInterviewState {
  status: "idle" | "connecting" | "active" | "completed" | "error";
  isEnding: boolean;
  isPractice: boolean;
  currentQuestionIndex: number;
  voicePhase: VoiceInterviewPhase;
  questions: InterviewQuestion[];
  displayQuestion: InterviewQuestion | null;
  transcripts: Array<{ role: "user" | "assistant"; text: string }>;
  liveUserTranscript: string;
  liveAssistantTranscript: string;
  allQuestionsAsked: boolean;
  introActive: boolean;
  timeLimitReached?: boolean;
  error?: string;
}

const LIVE_TRANSCRIPT_FLUSH_MS = 1000;

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

async function parseStartVoiceResponse(
  response: Response,
): Promise<StartVoiceResponse> {
  const bodyText = await response.text();
  if (!bodyText.trim()) {
    logInterview.error("voice", "start_voice_empty_body", {
      status: response.status,
      contentType: response.headers.get("content-type"),
    });
    throw new Error("Empty response from start-voice");
  }

  try {
    return JSON.parse(bodyText) as StartVoiceResponse;
  } catch (error) {
    logInterview.error("voice", "start_voice_json_parse_failed", {
      status: response.status,
      bodyPreview: bodyText.slice(0, 200),
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Invalid response from start-voice");
  }
}

function resolveQuestionForIndex(
  questions: InterviewQuestion[],
  index: number,
  fallback?: InterviewQuestion | null,
): InterviewQuestion | null {
  return questions[index] ?? fallback ?? null;
}

function isQuestionPhase(phase: VoiceInterviewPhase) {
  return (
    phase === "questions" || phase === "closing" || phase === "awaiting_end"
  );
}

function mergeQuestion(
  questions: InterviewQuestion[],
  question: InterviewQuestion,
): InterviewQuestion[] {
  const existingIndex = questions.findIndex((item) => item.id === question.id);
  if (existingIndex >= 0) {
    const next = [...questions];
    next[existingIndex] = { ...next[existingIndex], ...question };
    return next;
  }
  return [...questions, question];
}

async function requestDisplayMedia(): Promise<MediaStream> {
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

async function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 5000,
): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }, timeoutMs);

    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        window.clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function parseRealtimeSdpError(status: number, body: string): string {
  return formatRealtimeCallsError(status, body);
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
    isPractice: false,
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
  const practiceEndResolveRef = useRef<(() => void) | null>(null);
  const isPracticeRef = useRef(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveTranscriptBuffersRef = useRef({ user: "", assistant: "" });
  const startInFlightRef = useRef(false);
  const prevVoiceStatusRef = useRef(state.status);
  const prevVoicePhaseRef = useRef(state.voicePhase);

  useEffect(() => {
    if (prevVoiceStatusRef.current !== state.status) {
      logInterview.info("state", "voice_status_transition", {
        token: truncateId(token),
        from: prevVoiceStatusRef.current,
        to: state.status,
        voicePhase: state.voicePhase,
        isPractice: state.isPractice,
      });
      prevVoiceStatusRef.current = state.status;
    }
  }, [state.status, state.voicePhase, state.isPractice, token]);

  useEffect(() => {
    if (prevVoicePhaseRef.current !== state.voicePhase) {
      logInterview.info("state", "voice_phase_transition", {
        token: truncateId(token),
        from: prevVoicePhaseRef.current,
        to: state.voicePhase,
        questionIndex: state.currentQuestionIndex,
      });
      prevVoicePhaseRef.current = state.voicePhase;
    }
  }, [state.voicePhase, state.currentQuestionIndex, token]);

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
      if (!ws) {
        return;
      }
      sendDoMessage(ws, { type: "CHEATING_EVENT", eventType, metadata });
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
    logInterview.info("voice", "end_interview_start", {
      token: truncateId(token),
      isPractice: isPracticeRef.current,
    });
    setState((current) => ({ ...current, isEnding: true }));
    const isPractice = isPracticeRef.current;

    try {
      if (!isPractice && mediaRecorderRef.current?.state === "recording") {
        await stopMediaRecorder(mediaRecorderRef.current);
      }

      if (!isPractice) {
        await uploadRecording();
      }

      const ws = wsRef.current;
      let completedViaWs = false;

      if (ws?.readyState === WebSocket.OPEN) {
        const completedPromise = new Promise<void>((resolve) => {
          if (isPractice) {
            practiceEndResolveRef.current = () => {
              completedViaWs = true;
              resolve();
            };
          } else {
            endInterviewResolveRef.current = () => {
              completedViaWs = true;
              resolve();
            };
          }
          window.setTimeout(resolve, 12000);
        });

        sendDoMessage(ws, { type: "END_INTERVIEW" });
        await completedPromise;
      }

      if (!isPractice && !completedViaWs) {
        await completeSessionViaApi();
      }
    } catch (error) {
      logInterview.error("voice", "end_interview_failed", {
        token: truncateId(token),
        error: error instanceof Error ? error.message : String(error),
      });
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
      practiceEndResolveRef.current = null;
      cleanup();
    }

    setState((current) => ({
      ...current,
      status: isPractice ? "idle" : "completed",
      isEnding: false,
      isPractice: false,
    }));
    logInterview.success("voice", "end_interview_ok", {
      token: truncateId(token),
      isPractice,
    });
    isPracticeRef.current = false;
  }, [cleanup, completeSessionViaApi, uploadRecording]);

  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      const message = parseDoMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type !== "PONG") {
        logInterview.info("ws", "ws_message", {
          type: message.type,
          role: "role" in message ? message.role : undefined,
          questionIndex: "index" in message ? message.index : undefined,
          textPreview:
            "text" in message
              ? previewTranscriptText(message.text, 80)
              : undefined,
        });
      }

      switch (message.type) {
        case "CONNECTED": {
          const { currentQuestionIndex, voicePhase, questions, conversationHistory } =
            message.state;
          const index = currentQuestionIndex ?? 0;
          const phase = voicePhase ?? "intro";
          const incomingQuestions = questions?.length ? questions : undefined;
          const transcripts = mapConversationHistory(conversationHistory);

          setState((current) => {
            const mergedQuestions = incomingQuestions ?? current.questions;
            const displayQuestion = isQuestionPhase(phase)
              ? resolveQuestionForIndex(mergedQuestions, index)
              : null;

            return {
              ...current,
              status: "active",
              currentQuestionIndex: index,
              voicePhase: phase,
              introActive: phase === "intro" || phase === "awaiting_ready",
              questions: mergedQuestions,
              displayQuestion,
              transcripts,
              liveUserTranscript: "",
              liveAssistantTranscript: "",
            };
          });
          liveTranscriptBuffersRef.current = { user: "", assistant: "" };
          break;
        }

        case "INTRO_STARTED":
          setState((current) => ({
            ...current,
            voicePhase: "intro",
            introActive: true,
            displayQuestion: null,
          }));
          break;

        case "QUESTION_CHANGED": {
          const { index, question } = message;
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
          break;
        }

        case "ALL_QUESTIONS_ASKED":
          setState((current) => ({
            ...current,
            voicePhase: "awaiting_end",
            allQuestionsAsked: true,
            introActive: false,
          }));
          break;

        case "TRANSCRIPT_DELTA":
          liveTranscriptBuffersRef.current[message.role] += message.delta;
          break;

        case "TRANSCRIPT": {
          const role = message.role;
          liveTranscriptBuffersRef.current[role] = "";

          setState((current) => {
            const nextTranscripts = [
              ...current.transcripts,
              { role, text: message.text },
            ];
            logInterview.info("voice", "transcript_committed", {
              role,
              textPreview: previewTranscriptText(message.text),
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
          break;
        }

        case "ANSWER_SAVED":
          logInterview.info("voice", "answer_saved", {
            questionId: message.questionId,
          });
          break;

        case "INTERVIEW_COMPLETED":
          endInterviewResolveRef.current?.();
          setState((current) => ({ ...current, status: "completed" }));
          break;

        case "SESSION_TIME_LIMIT":
          logInterview.info("voice", "session_time_limit_reached", {});
          setState((current) => ({ ...current, timeLimitReached: true }));
          break;

        case "QUESTION_TIMED_OUT":
          logInterview.info("voice", "question_timed_out", {
            questionId: message.questionId,
          });
          break;

        case "PRACTICE_ENDED":
          practiceEndResolveRef.current?.();
          setState((current) => ({
            ...current,
            status: "idle",
            isPractice: false,
          }));
          isPracticeRef.current = false;
          break;

        case "ERROR":
          logInterview.error("ws", "ws_error_message", {
            message: message.message,
          });
          setState((current) => ({
            ...current,
            status: "error",
            error: message.message,
          }));
          break;

        case "PONG":
          break;
      }
    },
    [],
  );

  const start = useCallback(async (options?: { practice?: boolean }) => {
    if (startInFlightRef.current) {
      logInterview.warn("voice", "start_already_in_flight", {
        token: truncateId(token),
      });
      return;
    }

    const isPractice = options?.practice === true;
    startInFlightRef.current = true;
    logInterview.info("voice", "start_interview", {
      token: truncateId(token),
      isPractice,
    });
    isPracticeRef.current = isPractice;
    liveTranscriptBuffersRef.current = { user: "", assistant: "" };
    cleanup();
    setState({
      status: "connecting",
      isEnding: false,
      isPractice,
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

      logInterview.info("voice", "requesting_display_media", {
        token: truncateId(token),
      });
      const screenStream = await requestDisplayMedia();
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
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(recordingStream, { mimeType });
      } catch (error) {
        logInterview.warn("voice", "media_recorder_mime_fallback", {
          mimeType,
          error: error instanceof Error ? error.message : String(error),
        });
        recorder = new MediaRecorder(recordingStream);
        recordingMimeTypeRef.current = recorder.mimeType || "video/webm";
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      logInterview.info("voice", "requesting_start_voice", {
        token: truncateId(token),
        isPractice,
      });
      const startRes = await fetch(`/api/interview-token/${token}/start-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practice: isPractice }),
      });

      if (!startRes.ok) {
        let errorMessage = "Failed to start voice session";
        try {
          const bodyText = await startRes.text();
          if (bodyText.trim()) {
            const body = JSON.parse(bodyText) as { error?: string };
            errorMessage = body.error || errorMessage;
          }
        } catch (parseError) {
          logInterview.warn("voice", "start_voice_error_body_parse_failed", {
            status: startRes.status,
            error:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          });
        }
        throw new Error(`[start-voice] ${errorMessage}`);
      }

      const config = await parseStartVoiceResponse(startRes);
      logInterview.success("voice", "start_voice_ok", {
        sessionId: truncateId(config.sessionId),
        questionCount: config.questions.length,
        wsUrl: config.wsUrl,
      });

      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;
      ws.onmessage = handleWsMessage;

      ws.onopen = () => {
        logInterview.info("ws", "ws_open", { wsUrl: config.wsUrl });
        sendDoMessage(ws, { type: "PING" });
        sendDoMessage(ws, {
          type: "FULLSCREEN_STATE",
          isFullscreen: Boolean(document.fullscreenElement),
        });
      };

      ws.onerror = () => {
        logInterview.error("ws", "ws_error", { wsUrl: config.wsUrl });
      };

      ws.onclose = (closeEvent) => {
        logInterview.warn("ws", "ws_close", {
          code: closeEvent.code,
          reason: closeEvent.reason,
          wasClean: closeEvent.wasClean,
        });
      };

      logInterview.info("ws", "ws_connecting", {
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
        sendDoMessage(ws, {
          type: "REALTIME_EVENT",
          event: event.data,
        });
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const offerSdp = pc.localDescription?.sdp;
      if (!offerSdp) {
        throw new Error("Failed to create WebRTC offer");
      }

      logInterview.info("voice", "realtime_sdp_request", {
        token: truncateId(token),
        sdpLength: offerSdp.length,
      });

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offerSdp,
        headers: {
          Authorization: `Bearer ${config.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        logInterview.error("voice", "realtime_sdp_failed", {
          status: sdpResponse.status,
          bodyPreview: answerSdp.slice(0, 400),
        });
        throw new Error(`[realtime/calls] ${parseRealtimeSdpError(sdpResponse.status, answerSdp)}`);
      }

      const location = sdpResponse.headers.get("Location");
      const callId =
        location?.split("/").pop()?.trim() ??
        sdpResponse.headers.get("x-openai-call-id")?.trim() ??
        "";

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      if (callId) {
        const sendCallStarted = () => {
          if (ws.readyState === WebSocket.OPEN) {
            logInterview.info("ws", "call_started_sent", {
              callId: truncateId(callId),
              location,
            });
            sendDoMessage(ws, {
              type: "CALL_STARTED",
              callId,
              clientSecret: config.clientSecret,
            });
          } else {
            logInterview.warn("ws", "call_started_not_sent_ws_not_open", {
              callId: truncateId(callId),
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
        logInterview.warn("ws", "call_started_missing_call_id", {
          headerCallId: sdpResponse.headers.get("x-openai-call-id"),
          location: sdpResponse.headers.get("Location"),
        });
      }

      setState((current) => ({ ...current, status: "active" }));
    } catch (error) {
      logInterview.error("voice", "start_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      cleanup();
      setState({
        status: "error",
        isEnding: false,
        isPractice: isPracticeRef.current,
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
    } finally {
      startInFlightRef.current = false;
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
