import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InterviewQuestion,
  VoiceInterviewPhase,
} from "@workspace/interview-realtime/types";
import { parseDoMessage, sendDoMessage } from "@workspace/interview-realtime/events";
import { formatRealtimeCallsError } from "@workspace/ai-config";
import type { CheatingEventType } from "@workspace/db/enums";
import { useCheatingPrevention } from "./useCheatingPrevention";
import { logInterview, truncateId } from "#/features/voice-interview/interview-debug-log";
import {
  buildRecordingStream,
  getAudioOnlyStream,
  getRecordingMimeType,
  isIOSDevice,
  preflightMedia,
  requestDisplayMedia,
  requestUserMedia,
} from "#/features/voice-interview/voice/media";
import {
  createMediaRecorder,
  stopMediaRecorder,
  uploadRecording as uploadRecordingFile,
} from "#/features/voice-interview/voice/recording";
import {
  attachRemoteAudio,
  createDataChannel,
  monitorPeerConnection,
  watchDeviceChanges,
} from "#/features/voice-interview/voice/transport";
import {
  SessionSocket,
  WS_CLOSE_SUPERSEDED,
} from "#/features/voice-interview/voice/session-socket";

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
  /** True when running without screen capture (iOS / unsupported browsers). */
  audioOnly?: boolean;
  /** True when another tab superseded this connection (DO close code 4001). */
  replacedElsewhere?: boolean;
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

  const socketRef = useRef<SessionSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingMimeTypeRef = useRef("video/webm");
  const recordingUploadedRef = useRef(false);
  const audioOnlyRef = useRef(false);
  const endInterviewResolveRef = useRef<(() => void) | null>(null);
  const practiceEndResolveRef = useRef<(() => void) | null>(null);
  const isPracticeRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveTranscriptBuffersRef = useRef({ user: "", assistant: "" });
  const startInFlightRef = useRef(false);
  const deviceChangeCleanupRef = useRef<(() => void) | null>(null);
  const peerMonitorCleanupRef = useRef<(() => void) | null>(null);
  const pendingCallStartedRef = useRef<{
    callId: string;
    clientSecret: string;
  } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
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
      body: JSON.stringify({
        tabSwitches: 0,
        sessionId: sessionIdRef.current,
      }),
    });

    if (!response.ok && response.status !== 409 && response.status !== 410) {
      throw new Error("Failed to complete interview session");
    }
  }, [token]);

  const sendToDO = useCallback(
    (eventType: CheatingEventType, metadata?: Record<string, unknown>) => {
      const socket = socketRef.current;
      if (!socket) {
        return;
      }
      sendDoMessage(socket, { type: "CHEATING_EVENT", eventType, metadata });
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
    socketRef.current?.close();
    socketRef.current = null;
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
    sessionIdRef.current = null;
    recordingUploadedRef.current = false;
    deviceChangeCleanupRef.current?.();
    deviceChangeCleanupRef.current = null;
    peerMonitorCleanupRef.current?.();
    peerMonitorCleanupRef.current = null;
    pendingCallStartedRef.current = null;
  }, []);

  const uploadRecording = useCallback(async () => {
    await uploadRecordingFile(
      token,
      chunksRef.current,
      recordingMimeTypeRef.current,
      sessionIdRef.current,
    );
    recordingUploadedRef.current = true;
  }, [token]);

  /**
   * Runs when the DO completes the interview on its own (all questions asked)
   * before the candidate clicks End: stop the recorder, upload the recording
   * best-effort, and tear down media. Idempotent via {@link recordingUploadedRef}.
   */
  const handleAutoEnd = useCallback(async () => {
    if (isPracticeRef.current) {
      return;
    }
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        await stopMediaRecorder(mediaRecorderRef.current);
      }
      if (!recordingUploadedRef.current) {
        recordingUploadedRef.current = true;
        void uploadRecording().catch((error) =>
          logInterview.error("voice", "bg_upload_failed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    } catch (error) {
      logInterview.error("voice", "auto_end_finalize_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      cleanup();
    }
  }, [cleanup, uploadRecording]);

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

      if (!isPractice && !recordingUploadedRef.current) {
        recordingUploadedRef.current = true;
        void uploadRecording().catch((error) =>
          logInterview.error("voice", "bg_upload_failed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }

      const socket = socketRef.current;
      let completedViaWs = false;

      if (socket?.readyState === WebSocket.OPEN) {
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

        sendDoMessage(socket, { type: "END_INTERVIEW" });
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
          // Auto-end: the DO finished all questions before the candidate clicked
          // End — finalize the recording and tear down media.
          void handleAutoEnd();
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

      const { audioOnly } = preflightMedia();
      audioOnlyRef.current = audioOnly;
      setState((current) => ({ ...current, audioOnly }));

      logInterview.info("voice", "requesting_display_media", {
        token: truncateId(token),
        audioOnly,
        isIOS: isIOSDevice(),
      });

      const screenStream = audioOnly ? null : await requestDisplayMedia();
      if (screenStream) {
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack?.addEventListener("ended", () => {
          sendToDO("WINDOW_BLUR", { reason: "screen_share_stopped" });
          if (mediaRecorderRef.current?.state === "recording") {
            void stopMediaRecorder(mediaRecorderRef.current);
          }
        });
      }

      const stream = await requestUserMedia(audioOnly);
      streamRef.current = stream;
      deviceChangeCleanupRef.current?.();
      deviceChangeCleanupRef.current = watchDeviceChanges(() => {
        logInterview.info("voice", "device_change", {});
      });

      const { stream: recordingStream, audioContext } = buildRecordingStream(
        screenStream,
        stream,
        audioContextRef.current,
      );
      audioContextRef.current = audioContext;

      const mimeType = getRecordingMimeType(audioOnly);
      recordingMimeTypeRef.current = mimeType;

      const audioStream = getAudioOnlyStream(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = createMediaRecorder(
        recordingStream,
        mimeType,
        (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        },
      );

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
      sessionIdRef.current = config.sessionId;
      logInterview.success("voice", "start_voice_ok", {
        sessionId: truncateId(config.sessionId),
        questionCount: config.questions.length,
        wsUrl: config.wsUrl,
      });

      const socket = new SessionSocket(config.wsUrl, {
        onMessage: handleWsMessage,
        onOpen: () => {
          logInterview.info("ws", "ws_open", { wsUrl: config.wsUrl });
          sendDoMessage(socket, { type: "PING" });
          sendDoMessage(socket, {
            type: "FULLSCREEN_STATE",
            isFullscreen: Boolean(document.fullscreenElement),
          });
          const pending = pendingCallStartedRef.current;
          if (pending) {
            pendingCallStartedRef.current = null;
            sendDoMessage(socket, {
              type: "CALL_STARTED",
              callId: pending.callId,
              clientSecret: pending.clientSecret,
            });
          }
        },
        onClose: (code, reason) => {
          logInterview.warn("ws", "ws_close", { code, reason });
          if (code === WS_CLOSE_SUPERSEDED) {
            setState((current) => ({ ...current, replacedElsewhere: true }));
          }
        },
        canReconnect: () => {
          const s = stateRef.current.status;
          return s === "active" || s === "connecting";
        },
      });
      socketRef.current = socket;
      socket.connect();

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

      attachRemoteAudio(pc, remoteAudioRef);
      peerMonitorCleanupRef.current = monitorPeerConnection(pc);

      const oaiEvents = createDataChannel(pc, (event) => {
        const current = socketRef.current;
        if (current?.readyState !== WebSocket.OPEN) {
          return;
        }
        sendDoMessage(current, {
          type: "REALTIME_EVENT",
          event: event.data,
        });
      });
      void oaiEvents;

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
        if (socket.readyState === WebSocket.OPEN) {
          logInterview.info("ws", "call_started_sent", {
            callId: truncateId(callId),
            location,
          });
          sendDoMessage(socket, {
            type: "CALL_STARTED",
            callId,
            clientSecret: config.clientSecret,
          });
        } else {
          pendingCallStartedRef.current = {
            callId,
            clientSecret: config.clientSecret,
          };
          logInterview.warn("ws", "call_started_queued_ws_not_open", {
            callId: truncateId(callId),
            readyState: socket.readyState,
          });
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
