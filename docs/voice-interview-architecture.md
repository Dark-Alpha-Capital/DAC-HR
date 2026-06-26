# Voice Interview System — Architecture & Learning Guide

## The Big Picture

The system lets a candidate take a spoken job interview in their browser. An AI voice agent asks questions, listens to answers, and the candidate's responses are transcribed, recorded, and later evaluated. Here's the 4-layer architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CANDIDATE'S BROWSER                         │
│  getUserMedia() → mic + camera  │  getDisplayMedia() → screen  │
│  RTCPeerConnection → audio to OpenAI  │  WebSocket → DO server │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ WebRTC (audio)           │ WebSocket (control)
               ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────────────┐
│    OPENAI REALTIME   │   │     CLOUDFLARE DURABLE OBJECT        │
│  GPT Realtime model  │◄──│  InterviewSessionDO (stateful server)│
│  Whisper transcription│  │  • Talks to OpenAI via sideband WS   │
│  TTS voice output    │   │  • Runs interview state machine       │
└──────────────────────┘   │  • Stores transcripts to D1           │
                           │  • Detects cheating                    │
                           └──────────────┬───────────────────────┘
                                          │
                           ┌──────────────┴───────────────────────┐
                           │           STORAGE & POST-PROCESSING   │
                           │  D1 (SQLite) — sessions, responses    │
                           │  Nextcloud — screen recordings        │
                           │  Workflow — AI evaluation after       │
                           └──────────────────────────────────────┘
```

**The key insight:** Audio flows directly between the candidate's browser and OpenAI via WebRTC. The Durable Object does NOT relay audio — it only sends text commands (`response.create`) to OpenAI via a separate "sideband" WebSocket, and receives transcription events back. This is called the **sideband pattern**.

---

## Step-by-Step Learning Path

### Step 1: Understand Cloudflare Durable Objects

A Durable Object is a **stateful server** that Cloudflare pins to a single location. Unlike normal serverless functions that are stateless and can run anywhere, a DO:

- Has **persistent storage** (`this.durableState.storage`) — survives restarts
- Maintains **in-memory state** between requests
- Supports **WebSocket connections** — stays alive as long as clients are connected
- Is addressed by a unique ID — `INTERVIEW_SESSION_DO.idFromName(sessionId)` creates one DO instance per interview

**Key files to read:**

| File | Purpose |
|------|---------|
| `apps/frontend/src/lib/interview-realtime/ws-handler.ts` | How a WebSocket request reaches the DO |
| `apps/frontend/wrangler.jsonc` lines 52-59 | The DO binding config |

**Resources:**

- [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects WebSocket API](https://developers.cloudflare.com/durable-objects/api/websockets/)

---

### Step 2: Understand the Sideband Pattern

The "sideband" is a second WebSocket connection from the DO directly to OpenAI's Realtime API. It's separate from the browser's WebRTC connection.

```
Browser ──WebRTC (audio)──▶ OpenAI
   │
   │ WebSocket
   ▼
  DO ──sideband WS (commands)──▶ OpenAI
```

**Why sideband?** The DO can't inject commands into the browser's WebRTC data channel (it's peer-to-peer). So the DO opens its own WebSocket to the same OpenAI session to send commands (`session.update`, `response.create`) and receive transcription events.

**How it connects (lines 392-422 in `interview-session-do.ts`):**

```typescript
// Uses fetch() with Upgrade: websocket header — Cloudflare Workers can do this
response = await fetch(`https://api.openai.com/v1/realtime?call_id=${callId}`, {
  headers: {
    Authorization: `Bearer ${clientSecret}`,
    Upgrade: "websocket",
  },
});
const sideband = response.webSocket; // Cloudflare gives you the WS directly
sideband.accept();
```

**Sideband reconnection:** On unexpected close, the DO schedules exponential backoff retries:
- Max 5 reconnect attempts
- Delay doubles each retry: 1s → 2s → 4s → 8s → 16s (capped at 30s)
- `sidebandIntentionalClose` flag prevents reconnects when we deliberately close

---

### Step 3: Understand the Interview State Machine

The DO runs a phase-based state machine. Every phase transition happens on `response.done` from OpenAI:

```
                     ┌──────────────────────┐
                     │        INTRO         │
                     │  Welcome message     │
                     │  "Hi [name], welcome"│
                     └──────────┬───────────┘
                                │ candidate speaks anything
                                ▼
                     ┌──────────────────────┐
                     │    AWAITING_READY    │
                     │  Waiting for ready   │
                     │  signal from user    │
                     └──────────┬───────────┘
                                │ candidate indicates ready
                                ▼
          ┌──────────────────────────────────────────────┐
          │                 QUESTIONS                     │
          │  Loop for each question:                      │
          │    1. DO sends response.create for question   │
          │    2. AI speaks the question aloud            │
          │    3. Candidate answers (transcribed)         │
          │    4. DO saves transcript to D1               │
          │    5. DO advances to next question            │
          └──────────────────────┬───────────────────────┘
                                 │ last question answered
                                 ▼
                     ┌──────────────────────┐
                     │       CLOSING        │
                     │  Thank you message   │
                     │  "Click End Interview"│
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │    AWAITING_END      │
                     │  Wait for candidate  │
                     │  to click End button │
                     └──────────────────────┘
```

**Key code:** `handleResponseDone()` (line ~1069 in `interview-session-do.ts`) drives all phase transitions.

---

### Step 4: Understand the Browser Side (WebRTC)

The browser uses `RTCPeerConnection` to send microphone audio directly to OpenAI. This is standard WebRTC:

1. **Get media:** `getUserMedia({ audio: true, video: true })` + `getDisplayMedia()` for screen
2. **Merge audio tracks:** Screen audio + mic audio merged via `AudioContext` destination — so the recording captures both the candidate AND the AI agent's voice
3. **Create peer connection:** `new RTCPeerConnection()` with just an audio track
4. **Exchange SDP:** POST offer to `https://api.openai.com/v1/realtime/calls`, get SDP answer back
5. **Data channel:** `pc.createDataChannel("oai-events")` — this channel gets OpenAI events (VAD, transcription) that get forwarded to the DO via WebSocket

**Key file:** `apps/frontend/src/hooks/useVoiceInterview.ts` lines 531-720 (the `start()` function)

**Resources:**

- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI Realtime API docs](https://platform.openai.com/docs/guides/realtime)

---

### Step 5: Understand How Prompts/Instructions Work

The DO sends **two types** of messages to OpenAI via the sideband:

**`session.update`** (once, on connect) — Configures the model:

```javascript
{
  type: "session.update",
  session: {
    instructions: "You are conducting a structured job interview...",
    output_modalities: ["audio"],        // voice-only output
    audio: {
      input: {
        transcription: { model: "whisper-1" },  // enable transcription
        turn_detection: {
          type: "server_vad",             // voice activity detection
          create_response: false,         // don't auto-respond (DO controls it)
          interrupt_response: false,      // don't interrupt (let model finish)
        }
      },
      output: { voice: "alloy" }          // which TTS voice to use
    }
  }
}
```

**`response.create`** (for each question) — Tells the model to speak now:

```javascript
{
  type: "response.create",
  response: {
    instructions: "Ask this interview question now: Question 1: Tell me about yourself"
  }
}
```

**Key file:** `packages/interview-realtime/prompts.ts` — see also [voice-interview-prompting.md](./voice-interview-prompting.md) for cost optimization and phase-specific updates.

**Critical settings explained:**

| Setting | Value | Why |
|---------|-------|-----|
| `create_response` | `false` | The DO sends explicit `response.create` — if `true`, OpenAI would auto-respond after every user utterance |
| `interrupt_response` | `false` | The AI should finish speaking each question before listening. If `true`, the candidate could interrupt mid-question |
| `silence_duration_ms` | `700` | After 700ms of silence, the VAD considers the turn complete |
| `threshold` | `0.5` | VAD sensitivity (0.0-1.0) |
| `truncation.retention_ratio` | `0.7` | Drop extra history on truncate to improve cache hit rate |
| `token_limits.post_instructions` | `6000` | Cap conversation tokens after instructions |
| `reasoning.effort` | `low` | Lower latency for gpt-realtime-2 |

---

## Cost Optimization (Phase A)

1. **Truncation** — `retention_ratio: 0.7` + `post_instructions: 6000` reduces cache-busting on long sessions ([Realtime costs guide](https://developers.openai.com/api/docs/guides/realtime-costs)).
2. **Deduped `response.create`** — Brief events reference question numbers instead of re-embedding full question text.
3. **`max_output_tokens`** — Capped on ack (80), intro follow-up (120), closing (150).
4. **Eval short-circuit** — `looksLikeNoise()` skips Chat Completions for obvious noise; `looksLikeReadyConfirmation()` skips intro eval for clear "yes/ready" utterances.

---

## Prompt Structure (Phase B)

Instructions use labeled Realtime 2 sections: Role, Personality, Language, Reasoning, Preambles, Verbosity, Unclear Audio, Questions (single source of truth), Interview Flow (phase-specific). Full detail in [voice-interview-prompting.md](./voice-interview-prompting.md).

---

## Phase Flow & Dynamic session.update (Phase C)

On sideband connect, the DO sends a full `session.update` with intro-phase flow. When `voicePhase` transitions, it sends a lightweight `session.update` that reuses the cached base prefix (role + questions) and swaps only the Interview Flow appendix:

| Transition | Phase update |
|------------|--------------|
| Welcome done | `awaiting_ready` or `questions` |
| Candidate ready | `questions` |
| Last answer acked | `closing` |
| Closing done | `awaiting_end` |

Log grep: `"action":"phase_session_update_sent"`.

---

## cached_tokens Observability

Each `response.done` logs parsed token usage on `response_metrics` and `response_done`:

```bash
wrangler tail | grep response_metrics | grep cachedTokens
wrangler tail | grep '"cachedTokens":[1-9]'
```

Example:

```json
{"msg":"🔌 [interview:ws] response_metrics","action":"response_metrics","reason":"ask_current_question","cachedTokens":1100,"inputTokens":1240,"outputTokens":45}
```

---

## Eval Pipeline

```
Candidate utterance
       │
       ▼
 looksLikeNoise? ──yes──► fallback (no API)
       │ no
       ▼
 (intro only) looksLikeReadyConfirmation? ──yes──► ready (no API)
       │ no
       ▼
 gpt-4o-mini Chat Completions eval
```

Logs: `"action":"noise_short_circuit"`, `"action":"ready_short_circuit"`, `"action":"answer_evaluated"`.

---

### Step 6: Understand the Data Flow During a Question

Here's what happens when the AI asks Question 1:

```
1. DO sends: response.create { instructions: "Ask Question 1..." }
2. OpenAI → browser: audio stream (AI speaks directly via WebRTC)
3. OpenAI → DO (sideband): response.output_audio_transcript.delta "Tell me..."
4. DO → browser (WS): TRANSCRIPT_DELTA { role: "assistant", delta: "Tell me..." }
5. Browser shows live transcript in sidebar
6. OpenAI → DO: response.output_audio_transcript.done (full text)
7. OpenAI → DO: response.done { response: { status: "completed" } }
8. DO: transitions to "awaiting answer" phase

9. Candidate speaks → mic → WebRTC → OpenAI
10. OpenAI → DO: input_audio_transcription.delta "Well, I have 5 years..."
11. DO → browser: TRANSCRIPT_DELTA { role: "user", delta: "Well, I have..." }
12. OpenAI → DO: input_audio_transcription.completed (full transcript)
13. DO: saveUserTranscript() → saves to D1, marks question answered
14. DO: advanceQuestion() → moves to Question 2
15. Back to step 1 with Question 2
```

---

### Step 7: Understand Cheating Prevention

Simple but effective — monitored entirely in the browser:

```typescript
document.addEventListener("visibilitychange", () => report("TAB_SWITCHED"));
window.addEventListener("blur", () => report("WINDOW_BLUR"));
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) report("FULLSCREEN_EXITED");
});
document.addEventListener("copy", (e) => { e.preventDefault(); report("COPY_ATTEMPT"); });
document.addEventListener("paste", (e) => { e.preventDefault(); report("PASTE_ATTEMPT"); });
```

Events are rate-limited (1/sec per type) and persisted to D1. The evaluation workflow later reads the cheating summary and factors it into the score.

---

### Step 8: Post-Interview Evaluation

After the interview completes, `InterviewEvaluationWorkflow` runs:

1. Loads session + all responses from D1
2. Calls GPT-4o-mini via `generateObject()` with a structured Zod schema
3. Produces: score (0-100), recommendation (strong_hire/hire/maybe/reject), summary, strengths, risks, per-question feedback
4. Factors in cheating signals (tab switches, focus loss)
5. Persists evaluation to D1, sets session status to `reviewed`

---

## Code Files to Read in Order

| Order | File | What you'll learn |
|-------|------|-------------------|
| 1 | `packages/interview-realtime/types.ts` | All data structures — the vocabulary |
| 2 | `packages/interview-realtime/prompts.ts` | How we talk to OpenAI |
| 3 | `packages/interview-realtime/events.ts` | Message schemas and serialization |
| 4 | `packages/ai-config/realtime.ts` | Ephemeral key creation, sideband URLs |
| 5 | `apps/frontend/src/lib/interview-realtime/ws-handler.ts` | How WS requests reach the DO |
| 6 | `apps/frontend/src/durable-objects/interview-session-do.ts` | The brain (1600 lines) |
| 7 | `apps/frontend/src/hooks/useVoiceInterview.ts` | Browser-side orchestration |
| 8 | `apps/frontend/src/hooks/useCheatingPrevention.ts` | Anti-cheat monitoring |
| 9 | `apps/frontend/src/components/interview/VoiceInterview.tsx` | The UI |
| 10 | `apps/frontend/src/workflows/interview-evaluation.ts` | Post-interview AI scoring |
| 11 | `packages/db/repositories/interview-session-repository.ts` | Database layer |

---

## Key Resources & Documentation

| Topic | URL |
|-------|-----|
| Cloudflare Durable Objects | https://developers.cloudflare.com/durable-objects/ |
| DO WebSocket API | https://developers.cloudflare.com/durable-objects/api/websockets/ |
| OpenAI Realtime API | https://platform.openai.com/docs/guides/realtime |
| OpenAI Realtime WebRTC | https://platform.openai.com/docs/guides/realtime-webrtc |
| MDN WebRTC API | https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API |
| MDN getUserMedia | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia |
| MDN RTCPeerConnection | https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection |
| OpenAI Realtime costs | https://developers.openai.com/api/docs/guides/realtime-costs |
| OpenAI Realtime prompting | https://platform.openai.com/docs/guides/realtime |
| Server-sent VAD (OpenAI) | https://platform.openai.com/docs/guides/realtime-vad |

---

## Complete Data Flow (End-to-End)

```
CANDIDATE BROWSER                           SERVER (Cloudflare Worker)                  OPENAI
─────────────────                           ──────────────────────────                  ──────

1. Page load                                2a. /api/interview-token/$token/validate
   InterviewsComponent                        → token validation

3. Click "Start Voice"                      4. POST /api/interview-token/$token/
   → useVoiceInterview.start()                start-voice
                                              → assertInterviewTokenValid()
                                              → getQuestionsForInterviewSession()
                                              → buildRealtimeInstructions()
                                              → createRealtimeEphemeralSession()   ───→  POST /v1/realtime/client_secrets
                                                                                    ←─── ephemeral key
                                              → returns: clientSecret, wsUrl,
                                                questions, model

5. getDisplayMedia() (screen share)
6. getUserMedia() (mic + camera)
7. new RTCPeerConnection()
   → addTrack(micAudio)
8. POST /v1/realtime/calls (SDP offer)  ───────────────────────────────────────────────→ SDP answer
                                                                                    ←─── callId in headers

9. new WebSocket(wsUrl) ──────────────────→  handleInterviewRealtimeWs()
   /api/interview-realtime/ws                 → validate token
   ?token=xxx                                 → DO stub.fetch()

                                           ┌── InterviewSessionDO ─────────────────┐
                                           │ 10. ensureState() — load/create state │
                                           │ 11. send CONNECTED to client          │
                                           │                                        │
12. ws.send(CALL_STARTED) ────────────────→│ 13. connectSideband(callId, secret)    │
   { callId, clientSecret }               │     → fetch(HTTP Upgrade)              │
                                           │       https://api.openai.com/v1/       │
                                           │       realtime?call_id=xxx    ────────────→ 14. Sideband WS
                                           │                                        │  ←── connected
                                           │ 15. send session.update ───────────────→│ 16. Configures model
                                           │    (instructions, VAD, Whisper)        │
                                           │                                        │
                                           │ 17. sendWelcomeIntro() ────────────────→│ 18. AI speaks intro
                                           │    response.create                     │    "Hi [name], welcome"

                                           │ 19. response.audio.delta ←─────────────│ 20. Audio output
                                           │ 20b. broadcast transcript deltas       │

21. Candidate speaks                       │                                        │
   → mic → RTCPeerConnection ───────────────────────────────────────────────────→│ 22. Audio input
                                           │                                        │
                                           │ 23. input_audio_transcription          │
                                           │     .completed ←─────────────────────│ 24. Whisper transcribes
                                           │ 25. saveUserTranscript()               │
                                           │ 26. advanceQuestion()                   │
                                           │ 27. askCurrentQuestion() ──────────────→│ 28. AI asks next Q
                                           │                                        │
                                           │ ... repeat for all questions ...       │
                                           │                                        │
                                           │ 29. startClosingPhase() ───────────────→│ 30. AI says thanks
                                           │ 31. broadcast ALL_QUESTIONS_ASKED      │
                                           │                                        │
32. Click "End Interview"                  │                                        │
   → ws.send(END_INTERVIEW) ─────────────→│ 33. completeInterview()                 │
   → stop MediaRecorder                    │    → flushResponsesToDatabase()         │
   → uploadRecording() to Nextcloud        │    → updateSessionStatus("completed")   │
                                           │    → closeSideband(intentional)     ───→│ 34. Sideband closed
                                           │ 35. broadcast INTERVIEW_COMPLETED       │
                                           └────────────────────────────────────────┘

36. Session complete

37. (Async) Evaluation workflow triggered
    → InterviewEvaluationWorkflow
    → GPT-4o-mini evaluates responses
    → upsertEvaluation()
    → sets status to "reviewed"
```

---

## Common Gotchas We Hit During Development

1. **`modalities` is invalid in `response.create`** — only valid in `session.update`. Caused silent `unknown_parameter` errors with no visible failure.
2. **`voice` must be set** — without `audio.output.voice` in `session.update`, the model can't generate audio. Defaulted to `"alloy"`.
3. **Client data channel events are dropped when sideband exists** — to avoid duplicate processing of the same events from two connections. If sideband is connected, `client_dc` events from `handleRealtimeEvent()` are silently ignored.
4. **Sideband reconnects are critical** — the DO schedules exponential backoff retries (up to 5 attempts, max 30s delay) on unexpected disconnects. Without this, a single network blip kills the interview.
5. **DO storage needs explicit `persistState()` calls** — state isn't auto-saved. Called after every state mutation.
6. **`turn_detection.create_response: false` is essential** — if `true`, OpenAI auto-responds after every user utterance, creating a chaotic multi-response loop that breaks the interview flow.
7. **The welcome intro has a 2-second fallback timer** — if `session.updated` never arrives, the welcome intro fires anyway. This prevents silent hangs on session setup failure.

---

## All Source Files

| # | File | Lines | Role |
|---|---|---|---|
| 1 | `apps/frontend/src/durable-objects/interview-session-do.ts` | 1604 | Core DO — state machine, sideband, transcripts, cheating |
| 2 | `packages/interview-realtime/types.ts` | 79 | All shared type definitions |
| 3 | `packages/interview-realtime/events.ts` | 50 | Zod schemas + parse/serialize for WS messages |
| 4 | `packages/interview-realtime/prompts.ts` | System instructions, session config, event builders |
| 4b | `docs/voice-interview-prompting.md` | Prompt structure, cost optimization, observability |
| 5 | `packages/interview-realtime/index.ts` | 3 | Barrel re-exports |
| 6 | `packages/ai-config/realtime.ts` | 91 | OpenAI Realtime ephemeral sessions + sideband URLs |
| 7 | `packages/ai-config/index.ts` | 19 | Barrel exports for ai-config |
| 8 | `packages/ai-config/openai-client.ts` | 32 | Cached OpenAI client singleton |
| 9 | `packages/ai-config/ai-sdk-provider.ts` | 21 | Cached Vercel AI SDK provider |
| 10 | `apps/frontend/src/workflows/interview-evaluation.ts` | 106 | Post-interview AI evaluation workflow |
| 11 | `apps/frontend/src/workflows/document-indexing.ts` | 224 | Document RAG indexing workflow |
| 12 | `apps/frontend/src/lib/interview-realtime/ws-handler.ts` | 43 | WebSocket upgrade handler → routes to DO |
| 13 | `apps/frontend/src/server.ts` | 20 | Worker entry point — routes `/api/interview-realtime/ws` |
| 14 | `apps/frontend/src/hooks/useVoiceInterview.ts` | 776 | Client-side — WebRTC, WS, recording orchestration |
| 15 | `apps/frontend/src/hooks/useCheatingPrevention.ts` | 70 | Anti-cheat event monitoring |
| 16 | `apps/frontend/src/components/interview/VoiceInterview.tsx` | 380 | Voice interview UI component |
| 17 | `apps/frontend/src/routes/interview/$token/index.tsx` | 814 | Interview page — form + voice modes |
| 18 | `apps/frontend/src/routes/api/interview-token/$token/start-voice.tsx` | 107 | API: Start voice session |
| 19 | `apps/frontend/src/routes/api/interview-token/$token/validate.tsx` | 46 | API: Validate token |
| 20 | `apps/frontend/src/routes/api/interview-token/$token/schema.tsx` | 76 | API: Load interview schema |
| 21 | `apps/frontend/src/routes/api/interview-token/$token/responses.tsx` | 124 | API: Save typed/MCQ responses |
| 22 | `apps/frontend/src/routes/api/interview-token/$token/complete.tsx` | 79 | API: Complete interview |
| 23 | `apps/frontend/src/routes/api/interview-token/$token/upload-audio.tsx` | 110 | API: Upload session recording |
| 24 | `packages/db/repositories/interview-session-repository.ts` | 642 | All DB ops for sessions, responses, evaluations |
