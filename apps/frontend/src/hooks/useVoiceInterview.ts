import { useCallback, useEffect, useRef, useState } from "react";
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
  currentQuestionIndex: number;
  questions: VoiceQuestion[];
  transcripts: Array<{ role: "user" | "assistant"; text: string }>;
  liveUserTranscript: string;
  allQuestionsAsked: boolean;
  introActive: boolean;
  error?: string;
}

export function useVoiceInterview(token: string) {
  const [state, setState] = useState<VoiceInterviewState>({
    status: "idle",
    currentQuestionIndex: 0,
    questions: [],
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
    wsRef.current?.send(JSON.stringify({ type: "END_INTERVIEW" }));
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    await uploadRecording().catch(() => undefined);
    cleanup();
    setState((current) => ({ ...current, status: "completed" }));
  }, [cleanup, uploadRecording]);

  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      const message = JSON.parse(String(event.data)) as Record<string, unknown>;
      const type = typeof message.type === "string" ? message.type : "";

      if (type === "CONNECTED") {
        const connectedState = message.state as
          | {
              currentQuestionIndex?: number;
              questions?: VoiceQuestion[];
            }
          | undefined;

        setState((current) => ({
          ...current,
          status: "active",
          introActive: true,
          currentQuestionIndex: connectedState?.currentQuestionIndex ?? 0,
          questions: connectedState?.questions ?? current.questions,
        }));
      }

      if (type === "QUESTION_CHANGED" && typeof message.index === "number") {
        setState((current) => ({
          ...current,
          introActive: false,
          currentQuestionIndex: message.index as number,
        }));
      }

      if (type === "ALL_QUESTIONS_ASKED") {
        setState((current) => ({
          ...current,
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
      currentQuestionIndex: 0,
      questions: [],
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "PING" }));
        ws.send(
          JSON.stringify({
            type: "FULLSCREEN_STATE",
            isFullscreen: Boolean(document.fullscreenElement),
          }),
        );
      };

      ws.onmessage = handleWsMessage;

      setState((current) => ({
        ...current,
        questions: config.questions,
      }));

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
        currentQuestionIndex: 0,
        questions: [],
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
  };
}
