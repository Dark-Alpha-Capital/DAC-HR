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
  allQuestionsAsked: boolean;
  introActive: boolean;
  error?: string;
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
    allQuestionsAsked: false,
    introActive: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const endInterviewResolveRef = useRef<(() => void) | null>(null);

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

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const uploadRecording = useCallback(async () => {
    if (chunksRef.current.length === 0) {
      return;
    }

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    await fetch(`/api/interview-token/${token}/upload-audio`, {
      method: "POST",
      body: formData,
    });
  }, [token]);

  const endInterview = useCallback(async () => {
    setState((current) => ({ ...current, isEnding: true }));

    try {
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

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      await uploadRecording().catch(() => undefined);
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

      if (type === "CONNECTED") {
        const connectedState = message.state as
          | {
              currentQuestionIndex?: number;
              voicePhase?: VoiceInterviewPhase;
              questions?: VoiceQuestion[];
            }
          | undefined;

        const index = connectedState?.currentQuestionIndex ?? 0;
        const voicePhase = connectedState?.voicePhase ?? "intro";
        const questions = connectedState?.questions?.length
          ? connectedState.questions
          : undefined;

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
          };
        });
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
        message.role === "user" &&
        typeof message.delta === "string"
      ) {
        setState((current) => ({
          ...current,
          liveUserTranscript: current.liveUserTranscript + message.delta,
        }));
      }

      if (
        type === "TRANSCRIPT" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string"
      ) {
        setState((current) => ({
          ...current,
          liveUserTranscript:
            message.role === "user" ? "" : current.liveUserTranscript,
          transcripts: [
            ...current.transcripts,
            { role: message.role as "user" | "assistant", text: message.text as string },
          ],
        }));
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
    setState({
      status: "connecting",
      isEnding: false,
      currentQuestionIndex: 0,
      voicePhase: "intro",
      questions: [],
      displayQuestion: null,
      transcripts: [],
      liveUserTranscript: "",
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const audioStream = new MediaStream(stream.getAudioTracks());
      chunksRef.current = [];
      const recorder = new MediaRecorder(audioStream);
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
        ws.send(JSON.stringify({ type: "PING" }));
        ws.send(
          JSON.stringify({
            type: "FULLSCREEN_STATE",
            isFullscreen: Boolean(document.fullscreenElement),
          }),
        );
      };

        setState((current) => ({
        ...current,
        questions: config.questions,
      }));

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      audioStream.getTracks().forEach((track) => pc.addTrack(track, audioStream));

      pc.ontrack = (event) => {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = event.streams[0] ?? null;
      };

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
      const callId =
        sdpResponse.headers.get("x-openai-call-id") ??
        sdpResponse.headers.get("Location")?.split("/").pop() ??
        "";

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      if (callId) {
        const sendCallStarted = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "CALL_STARTED", callId }));
          }
        };

        if (ws.readyState === WebSocket.OPEN) {
          sendCallStarted();
        } else {
          ws.addEventListener("open", sendCallStarted, { once: true });
        }
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
        allQuestionsAsked: false,
        introActive: false,
        error: error instanceof Error ? error.message : "Voice interview failed",
      });
    }
  }, [cleanup, handleWsMessage, token]);

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
