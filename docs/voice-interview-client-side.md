# Voice Interview — React Client-Side Deep Dive

## Overview of Files

| File | Lines | Role |
|------|-------|------|
| `src/routes/interview/$token/index.tsx` | 814 | Interview page — routes between states, manages form mode, wires voice hook |
| `src/hooks/useVoiceInterview.ts` | 776 | Core hook — WebRTC, WebSocket, recording orchestration |
| `src/hooks/useCheatingPrevention.ts` | 70 | Anti-cheat event listeners |
| `src/components/interview/VoiceInterview.tsx` | 380 | Voice interview UI — video, transcript sidebar, controls |
| `src/components/interview/WelcomeScreen.tsx` | — | Pre-interview instructions |
| `src/components/interview/DeliveryModePicker.tsx` | — | Form vs Voice mode picker |


## Architecture of the Client-Side

```
┌──────────────────────────────────────────────────────────────┐
│           InterviewPage (route)                              │
│           State machine: loading→welcome→voice→completed     │
│           Also handles form/text mode in parallel            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useVoiceInterview(token)                            │   │
│  │                                                      │   │
│  │  Manages:                                            │   │
│  │  • WebSocket connection to Durable Object            │   │
│  │  • RTCPeerConnection to OpenAI                       │   │
│  │  • MediaRecorder for screen recording                │   │
│  │  • Transcript state (live + committed)               │   │
│  │  • Interview phase state                             │   │
│  │                                                      │   │
│  │  Exposes:                                            │   │
│  │  • state (VoiceInterviewState)                       │   │
│  │  • start() — begin voice interview                   │   │
│  │  • endInterview() — stop recording, complete session │   │
│  │  • videoStreamRef — camera stream for display          │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ state, start(), endInterview()         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │  VoiceInterview (UI component)                       │   │
│  │                                                      │   │
│  │  • Camera video display (mirrored)                    │   │
│  │  • Bot icon PiP (interviewer placeholder)            │   │
│  │  • Live transcript sidebar                           │   │
│  │  • Current question with MCQ options                 │   │
│  │  • Clock, elapsed time, session title                │   │
│  │  • End Interview button                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useCheatingPrevention(sendToDO, enabled)            │   │
│  │                                                      │   │
│  │  Listens for:                                        │   │
│  │  • visibilitychange → TAB_SWITCHED                   │   │
│  │  • blur → WINDOW_BLUR                                │   │
│  │  • fullscreenchange → FULLSCREEN_EXITED              │   │
│  │  • copy → COPY_ATTEMPT (prevented)                   │   │
│  │  • paste → PASTE_ATTEMPT (prevented)                 │   │
│  │  • contextmenu → COPY_ATTEMPT (prevented)            │   │
│  │  • beforeunload → warns before navigation            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```


## 1. Interview Page — State Machine (`routes/interview/$token/index.tsx`)

The interview page is the top-level route for candidates. It has 7 states:

```
loading ←── page first loads
   │
   ▼
invalid ←── token expired, invalid, or completed
   │
   ▼
mode_picker ←── hybrid session (candidate picks form or voice)
   │
   ├── "form" → sessionStorage, set mode
   └── "voice" → sessionStorage, set mode
        │
        ▼
welcome ←── instructions screen with Start button
   │
   ├── "form" → loadInterviewSchema() → in_progress (typed answers)
   └── "voice" → useVoiceInterview.start() → voice (WebRTC)
        │
        ▼
in_progress ←── form mode: question cards with text/MCQ inputs
   │
   ▼
voice ←── voice mode: VoiceInterview component (full-screen)
   │
   ▼
completed ←── success card with checkmark
```

**Key design decisions:**
- Mode choice is stored in `sessionStorage` per token — survives page refresh
- For `hybrid` sessions, candidate picks form or voice
- For `voice`-only sessions, skips the picker entirely
- For `form`-only sessions, skips the picker entirely
- When revisiting an `in_progress` session, restores the saved mode

**How `useVoiceInterview` is wired in (line 344):**
```typescript
const voiceInterview = useVoiceInterview(token);

// Transitions to "completed" when the voice hook reports it
useEffect(() => {
  if (voiceInterview.state.status === "completed") {
    setStatus("completed");
  }
}, [voiceInterview.state.status]);
```

**How the VoiceInterview UI gets rendered (lines in the 500s-600s):**
```tsx
<VoiceInterview
  candidateName={welcomeData.candidateName}
  positionName={welcomeData.positionName}
  roundName={welcomeData.roundName}
  state={voiceInterview.state}
  videoStreamRef={voiceInterview.videoStreamRef}
  onStart={voiceInterview.start}
  onEnd={voiceInterview.endInterview}
/>
```

The interview page doesn't need to understand WebRTC at all — `useVoiceInterview` encapsulates everything and exposes a clean state + action interface.


## 2. Core Hook — `useVoiceInterview.ts`

This is the heart of the client-side voice interview. It's 776 lines managing three parallel realtime connections and media capture.

### State (lines 163-175)

```typescript
interface VoiceInterviewState {
  status: "idle" | "connecting" | "active" | "completed" | "error";
  isEnding: boolean;           // true while uploading recording
  currentQuestionIndex: number; // which question we're on
  voicePhase: VoiceInterviewPhase; // from DO: intro/awaiting_ready/questions/closing
  questions: VoiceQuestion[];   // all questions for this session
  displayQuestion: VoiceQuestion | null; // current question shown in sidebar
  transcripts: Array<{ role; text }>;    // committed transcript entries
  liveUserTranscript: string;            // buffered partial user text
  liveAssistantTranscript: string;       // buffered partial assistant text
  allQuestionsAsked: boolean;            // closing phase reached
  introActive: boolean;                  // intro is playing
  error?: string;
}
```

### Refs (lines 177-187)

```typescript
wsRef          → WebSocket to Durable Object
pcRef          → RTCPeerConnection to OpenAI
mediaRecorderRef → MediaRecorder for screen recording
chunksRef      → Blob[] accumulating recorded data
streamRef      → MediaStream from getUserMedia (camera + mic)
screenStreamRef → MediaStream from getDisplayMedia (screen)
audioContextRef  → AudioContext for merging audio tracks
remoteAudioRef   → HTMLAudioElement for AI speech playback
endInterviewResolveRef → Promise resolver for end flow
liveTranscriptBuffersRef → { user: "", assistant: "" } for delta accumulation
```

### The `start()` function (line 531) — The Orchestrator

This is where everything happens. Called when candidate clicks "Start Voice Interview".

**Phase 1: Request fullscreen (line 548)**
```typescript
await document.documentElement.requestFullscreen().catch(() => undefined);
```
Fullscreen is needed so we can monitor `FULLSCREEN_EXITED` cheating events.

**Phase 2: Get ephemeral key from server (lines 550-559)**
```typescript
const startRes = await fetch(`/api/interview-token/${token}/start-voice`, {
  method: "POST",
});
const config = await startRes.json();
// Returns: { clientSecret, sessionId, wsUrl, model, questions }
```
The server creates an ephemeral OpenAI key (`createRealtimeEphemeralSession`) and returns everything the client needs.

**Phase 3: Capture screen (lines 561-573)**
```typescript
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { displaySurface: "browser", width: 1920, height: 1080, frameRate: 30 },
  audio: true,
  preferCurrentTab: true,        // pre-selects this tab
  selfBrowserSurface: "include", // capture own tab audio
});
```
Captures the interview tab only. The `audio: true` + `selfBrowserSurface: "include"` captures system audio (including the AI agent's voice from the speaker).

**Phase 4: Capture camera + mic (lines 583-591)**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: { facingMode: "user", width: 1280, height: 720 },
});
```

**Phase 5: Merge audio tracks for recording (lines 593-598)**
```typescript
const { stream: recordingStream, audioContext } = buildRecordingStream(
  screenStream,   // video + system audio
  stream,         // mic audio
  audioContextRef.current,
);
```
The `buildRecordingStream()` utility (line 113) merges:
- Screen video tracks (from screen share)
- System audio tracks (AI agent's voice from speakers)
- Mic audio track (candidate's voice)

All three go into a single `MediaStream` for recording. Uses `AudioContext.createMediaStreamDestination()` to mix audio sources.

**Phase 6: Start MediaRecorder (lines 600-612)**
```typescript
const recorder = new MediaRecorder(recordingStream, { mimeType: "video/webm" });
recorder.ondataavailable = (event) => {
  if (event.data.size > 0) chunksRef.current.push(event.data);
};
recorder.start(1000); // 1-second chunks
```
Records the merged stream in 1-second chunks. At the end, chunks are concatenated into a single `.webm` blob and uploaded to Nextcloud via `/api/interview-token/$token/upload-audio`.

**Phase 7: Open WebSocket to DO (lines 614-648)**
```typescript
const ws = new WebSocket(config.wsUrl);
ws.onmessage = handleWsMessage;
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "PING" }));
  ws.send(JSON.stringify({ type: "FULLSCREEN_STATE", isFullscreen: true }));
};
```
Connects to `wss://.../api/interview-realtime/ws?token=xxx&sessionId=xxx`. This WebSocket is the control channel to the Durable Object.

**Phase 8: Create RTCPeerConnection to OpenAI (lines 651-667)**
```typescript
const pc = new RTCPeerConnection();
audioStream.getTracks().forEach((track) => pc.addTrack(track, audioStream));
pc.ontrack = (event) => {
  // OpenAI's audio output → play via hidden <audio> element
  let audio = remoteAudioRef.current;
  if (!audio) {
    audio = document.createElement("audio");
    audio.autoplay = true;
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
  }
  audio.srcObject = event.streams[0] ?? null;
};
```
Browser sends mic audio to OpenAI. OpenAI's response audio comes back via `ontrack` and is played through a hidden `<audio>` element.

**Phase 9: Open data channel for events (lines 669-681)**
```typescript
const oaiEvents = pc.createDataChannel("oai-events");
oaiEvents.addEventListener("message", (event) => {
  ws.send(JSON.stringify({
    type: "REALTIME_EVENT",
    event: event.data,       // raw OpenAI event (transcription, VAD, etc.)
  }));
});
```
The `oai-events` data channel receives OpenAI events (like VAD events, transcription starts/stops) and forwards them to the DO via WebSocket. These are the same events the DO would get from its sideband, forwarded from the browser.

**Phase 10: SDP exchange with OpenAI (lines 683-706)**
```typescript
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

const answerSdp = await sdpResponse.text();
const callId = sdpResponse.headers.get("Location")?.split("/").pop();
await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
```
Standard WebRTC SDP exchange. The `callId` extracted from the Location header is what connects the browser's WebRTC session and the DO's sideband to the same OpenAI realtime session.

**Phase 11: Send CALL_STARTED to DO (lines 708-741)**
```typescript
ws.send(JSON.stringify({
  type: "CALL_STARTED",
  callId,
  clientSecret: config.clientSecret,
}));
```
This is the critical handoff — the DO receives the callId + clientSecret, opens its sideband to the same OpenAI session, and starts controlling the interview.

### The `handleWsMessage()` function (line 348) — Processing DO Commands

Every message from the DO drives state changes:

| Message Type | What It Does |
|---|---|
| `CONNECTED` | Initializes state from DO snapshot — sets questions, phase, transcript history, current question index |
| `INTRO_STARTED` | Sets `introActive: true`, clears display question |
| `QUESTION_CHANGED` | Updates `currentQuestionIndex`, sets `displayQuestion` to the current question object, disables intro |
| `ALL_QUESTIONS_ASKED` | Sets `allQuestionsAsked: true`, transitions to `awaiting_end` phase |
| `TRANSCRIPT_DELTA` | Buffers partial transcript text (accumulates until committee) |
| `TRANSCRIPT` | Commits a full transcript entry, clears the buffer for that role |
| `INTERVIEW_COMPLETED` | Resolves the end-interview promise, sets status to `completed` |
| `ERROR` | Sets status to `error` with the error message |

### Live Transcript Buffering (lines 214-254, 471-483)

Transcript deltas (real-time speech-to-text) are buffered locally and flushed to React state every 1 second:

```typescript
// On TRANSCRIPT_DELTA:
liveTranscriptBuffersRef.current[role] += message.delta;

// Every 1 second (useEffect with setInterval):
setState((current) => ({
  ...current,
  liveUserTranscript: userBuffer,
  liveAssistantTranscript: assistantBuffer,
}));
```

This avoids re-rendering on every character, which would be ~20-50 renders per second during speech. The buffer is cleared when a full `TRANSCRIPT` message arrives (the completed utterance).

### The `endInterview()` function (line 298)

Called when candidate clicks "End Interview":

1. Sets `isEnding: true` — UI shows spinner
2. Stops the MediaRecorder (requests final data chunk, then stops)
3. Uploads recording to Nextcloud via `/api/interview-token/$token/upload-audio`
4. Sends `END_INTERVIEW` to DO via WebSocket
5. Waits for `INTERVIEW_COMPLETED` from DO (or 12s timeout)
6. Falls back to direct API call if WebSocket fails
7. Cleans up all connections (WS, RTCPeerConnection, streams)

### Cleanup (line 256)

```typescript
const cleanup = useCallback(() => {
  wsRef.current?.close();
  pcRef.current?.close();
  mediaRecorderRef.current?.stop();
  streamRef.current?.getTracks().forEach(t => t.stop());
  screenStreamRef.current?.getTracks().forEach(t => t.stop());
  audioContextRef.current?.close();
  remoteAudioRef.current?.remove();
  liveTranscriptBuffersRef.current = { user: "", assistant: "" };
}, []);
```

All connections and media tracks are stopped. The cleanup runs on unmount (useEffect line 763) and on error during start.

### Error Handling (lines 744-760)

If any step in `start()` fails:
- `cleanup()` is called to release all resources
- State is set to `error` with the error message
- The `VoiceInterview` component shows a retry button


## 3. VoiceInterview UI Component (`VoiceInterview.tsx`)

The UI is a full-screen dark-themed interface (Google Meet-like).

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Camera view (mirrored)     │  Live Transcript Sidebar  │
│                             │                           │
│  ┌───────────────────────┐  │  Question: Tell me about  │
│  │                       │  │  yourself.                │
│  │    Candidate video    │  │  (MCQ options shown if    │
│  │    (fullscreen fit)   │  │   applicable)             │
│  │                       │  │                           │
│  │  [candidate name]     │  │  ┌─────────────────────┐  │
│  │                       │  │  │ Interviewer:        │  │
│  │  ┌─────┐             │  │  │ Welcome to the...   │  │
│  │  │ Bot │ Interviewer  │  │  └─────────────────────┘  │
│  │  │ icon│ PiP          │  │  ┌─────────────────────┐  │
│  │  └─────┘             │  │  │ You:                │  │
│  └───────────────────────┘  │  │ Well, I have 5 yrs  │  │
│                             │  └─────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  10:45 AM | Screening — Fullstack Dev  |  [End Call]   │
└─────────────────────────────────────────────────────────┘
```

### Key UI Features

**Video (lines 171-178):**
```tsx
<video
  ref={videoRef}
  autoPlay muted playsInline
  style={{ transform: "scaleX(-1)" }}  // mirror the camera
/>
```
The `srcObject` is set from the hook's `videoStreamRef` (the `getUserMedia` stream). Muted to prevent echo (the video element shows camera but does not play audio).

**Bot PiP (lines 185-192):**
A small picture-in-picture showing a Bot icon as the "Interviewer". There's no actual interviewer video — this is just a visual placeholder.

**Transcript Sidebar (lines 198-296):**
- Shows the current question at the top (with MCQ options if applicable)
- Shows "Welcome" badge during intro phase
- Shows `TRANSCRIPT` entries as speech bubbles (blue = candidate, grey = AI)
- Shows live `TRANSCRIPT_DELTA` text with a pulsing dot indicator
- Auto-scrolls to bottom on new content

**Bottom Bar (lines 300-337):**
- Current time (updates every second)
- Session title (Round Name — Position)
- Elapsed time (mm:ss format)
- End Interview button (red, pulsing when all questions are done)

### State-Based Rendering

```typescript
if (state.status === "connecting") {
  // Show loading overlay: "Connecting to your interviewer..."
}

if (state.status === "active") {
  // Show full UI with video + transcript
}

if (state.isEnding) {
  // Disable End button, show spinner
}

if (state.status === "completed") {
  // This causes InterviewPage to switch to completed screen
}

if (state.status === "error") {
  // Show retry button with error message
}
```

### Elapsed Timer (lines 81-93)

```typescript
useEffect(() => {
  if (state.status !== "active") return;
  const startedAt = Date.now();
  const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}, [state.status]);
```

Starts a 1-second counter from when the status becomes "active".


## 4. Cheating Prevention (`useCheatingPrevention.ts`)

A 70-line hook that monitors 7 browser events:

```typescript
export function useCheatingPrevention(
  sendToDO: (eventType, metadata?) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    // 1. User switches to another tab
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) sendToDO("TAB_SWITCHED");
    });

    // 2. Browser window loses focus (Alt+Tab)
    window.addEventListener("blur", () => {
      sendToDO("WINDOW_BLUR");
    });

    // 3. Exit fullscreen
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) sendToDO("FULLSCREEN_EXITED");
    });

    // 4. Copy (prevented entirely)
    document.addEventListener("copy", (e) => {
      e.preventDefault();
      sendToDO("COPY_ATTEMPT");
    });

    // 5. Paste (prevented entirely)
    document.addEventListener("paste", (e) => {
      e.preventDefault();
      sendToDO("PASTE_ATTEMPT");
    });

    // 6. Right-click (prevented entirely)
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      sendToDO("COPY_ATTEMPT", { source: "contextmenu" });
    });

    // 7. Accidental navigation (warn before leaving)
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault();
      e.returnValue = "";
    });

    return () => { /* remove all listeners */ };
  }, [enabled]);
}
```

The hook is only enabled when `state.status === "active"` (line 212 in useVoiceInterview.ts):
```typescript
useCheatingPrevention(sendToDO, state.status === "active");
```

The DO rate-limits cheating events to 1 per second per type (line 44 in interview-session-do.ts).


## Complete Connection Map

```
 Browser                                     Server                        OpenAI
 ───────                                     ──────                        ──────

 getUserMedia ─────── camera stream ──→ videoRef (display only)
     │
     ├── mic audio track
     │         │
     │         ├────────────────────────→ RTCPeerConnection ──────────→ Audio Input
     │         │                                                           │
     │         ├── merged with screen audio                                │
     │         │   for MediaRecorder ──→ chunks → uploadRecording()        │
     │         │                                            → Nextcloud    │
     │         │                                                           │
     │         └── AudioContext merge                                      │
     │                                                                     │
 getDisplayMedia ──── video + system audio                                │
                                                                           │
 RTCPeerConnection ──── "oai-events" data channel                         │
     │                     │                                               │
     │                     ▼ (REALTIME_EVENT forwarded)                    │
     │               WebSocket ──────────→ DO ─── sideband WS ──────────→│
     │                                                                     │
     │                     ◄──── Audio stream back ────────────────────│
     │                     (hidden <audio> element plays it)              │
     │                                                                     │
     │                                                                     │
 WebSocket ◄──────────────────── DO messages ◄──── sideband WS ◄───────│
     │                   (CONNECTED, TRANSCRIPT, QUESTION_CHANGED, etc.)  │
     ▼                                                                     │
 handleWsMessage() → setState() → VoiceInterview re-renders               │
```

## Key Learning Points

1. **Three parallel connections:**
   - WebSocket to DO (control)
   - RTCPeerConnection to OpenAI (audio)
   - Sideband WebSocket from DO to OpenAI (AI commands)

2. **Audio merging:** `AudioContext.createMediaStreamDestination()` mixes mic + system audio for a single recording that captures both candidate and AI voices.

3. **Transcript buffering:** Deltas accumulate in a ref (not state), flushed to React state every 1 second via `setInterval` — prevents 50 renders/second during speech.

4. **Browser → DO event relay:** `oai-events` data channel events (VAD, transcription) are forwarded to the DO via WebSocket. This is the client's report path for what OpenAI is doing.

5. **DO → browser sync:** The DO is the source of truth. On connect, the DO sends `CONNECTED` with full state snapshot (questions, phase, history). All subsequent state changes come from DO messages.

6. **Recording happens on client only:** The DO never sees audio bytes. The browser records locally and uploads to Nextcloud at the end.

7. **Error recovery:** Any failure during `start()` triggers full cleanup of all connections and media tracks, restoring the UI to the retry state.
