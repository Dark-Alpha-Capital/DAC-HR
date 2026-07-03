# Voice Interview System — Complete Reference

> End-to-end architecture, configuration, parameters, and data flow.
> Companion to `voice-interview-architecture.md` (how it works) and
> `voice-interview-prompting.md` (prompt engineering).
> This is the **reference manual** — all params, all files, all flows.

---

## Architecture at a glance

```
┌─ Browser ────────────────────────────────────────────────────────────┐
│  useVoiceInterview(token)                                            │
│                                                                      │
│  getUserMedia() → mic + camera       getDisplayMedia() → screen      │
│       │                                        │                     │
│       ├── RTCPeerConnection ──► OpenAI Realtime (WebRTC audio)       │
│       │   (oai-events data channel)                                  │
│       │                                        │                     │
│       ├── AudioContext.merge(mic + system) ──► MediaRecorder         │
│       │                                        │ (webm chunks)       │
│       │                                        ▼                     │
│       │                                   POST /upload-audio         │
│       │                                      → Nextcloud             │
│       │                                                              │
│       └── WebSocket ──► Cloudflare Worker ──► InterviewSessionDO     │
└──────────────────────────────────────────────────────────────────────┘

┌─ Cloudflare ─────────────────────────────────────────────────────────┐
│  InterviewSessionDO (Durable Object)                                 │
│  State machine: intro → awaiting_ready → questions → closing → end   │
│                                                                      │
│  Sideband WS ──► OpenAI Realtime                                     │
│    • session.update    (VAD, whisper-1, TTS voice)                   │
│    • response.create   (speak each question)                         │
│    • ◄── transcription events (Whisper)                              │
│                                                                      │
│  Answer Evaluation: gpt-4o-mini Chat Completions                     │
│    • looksLikeNoise() → skip API                                     │
│    • looksLikeReadyConfirmation() → skip API                         │
│    • evaluateCandidateAnswer() → sufficient? follow-up?              │
│                                                                      │
│  Persistence: D1 (SQLite) + DO storage                               │
│                                                                      │
│  InterviewEvaluationWorkflow (post-interview)                         │
│    • Loads all responses from D1                                     │
│    • gpt-4o-mini → structured evaluation                             │
│    • Score, recommendation, strengths, risks, per-question feedback  │
└──────────────────────────────────────────────────────────────────────┘
```

**Key principle:** Audio never touches the server. Browser ↔ OpenAI is direct WebRTC. The DO communicates with OpenAI only via a text-based "sideband" WebSocket — it sends commands and receives transcription events, never audio bytes.

---

## File Map (all voice-related files)

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/durable-objects/interview-session-do.ts` | 2051 | **The brain** — state machine, sideband WS, answer routing, persistence |
| 2 | `src/hooks/useVoiceInterview.ts` | 974 | **Client orchestrator** — WebRTC, WS, MediaRecorder, transcript buffering |
| 3 | `src/routes/interview/$token/index.tsx` | 1369 | **Route page** — mode picker, welcome flow, wires hook to UI |
| 4 | `src/components/interview/VoiceInterview.tsx` | 385 | **UI** — fullscreen dark UI, camera, transcripts, timer |
| 5 | `src/hooks/useCheatingPrevention.ts` | 70 | **Anti-cheat** — tab switch, blur, fullscreen, copy/paste detection |
| 6 | `src/lib/interview-realtime/ws-handler.ts` | 68 | **WS routing** — resolves token, routes to DO |
| 7 | `src/routes/api/interview-token/$token/start-voice.tsx` | 218 | **API: start** — creates ephemeral key, returns session config |
| 8 | `src/routes/api/interview-token/$token/upload-audio.tsx` | 120 | **API: upload** — uploads recording to Nextcloud |
| 9 | `src/workflows/interview-evaluation.ts` | 106 | **Eval workflow** — post-interview AI evaluation |
| 10 | `packages/interview-realtime/types.ts` | 86 | **Shared types** — phases, messages, state |
| 11 | `packages/interview-realtime/events.ts` | 50 | **Message schemas** — Zod validation, serialization |
| 12 | `packages/interview-realtime/prompts.ts` | 348 | **Prompts** — system instructions, session.update events |
| 13 | `packages/interview-realtime/answer-evaluation.ts` | 513 | **Answer eval** — noise detection, gpt-4o-mini evaluation |
| 14 | `packages/interview-realtime/practice-questions.ts` | 23 | **Practice** — 3 sample questions |
| 15 | `packages/interview-realtime/debug-log.ts` | 127 | **DO logging** — structured JSON, topic-based |
| 16 | `packages/interview-realtime/answer-evaluation.test.ts` | 21 | **Tests** — noise detection tests |
| 17 | `packages/ai-config/realtime.ts` | 105 | **OpenAI Realtime** — ephemeral key creation, sideband URL |
| 18 | `packages/ai-config/openai-client.ts` | 32 | **OpenAI client** — cached singleton |
| 19 | `packages/ai-config/ai-sdk-provider.ts` | 29 | **AI SDK** — Vercel AI SDK provider (eval workflow) |
| 20 | `src/lib/interview-debug-log.ts` | 123 | **Client logging** — structured JSON |
| 21 | `src/lib/interview-token.ts` | 102 | **Token resolver** — validates interview tokens |
| 22 | `src/lib/interview-analysis-prompt.ts` | 239 | **Eval prompts** — builds evaluation prompt |
| 23 | `src/lib/schemas/interview-ai-analysis-schema.ts` | 111 | **Eval schema** — Zod schema for structured output |
| 24 | `src/lib/server/openai-api-key.ts` | 66 | **API key** — resolves from env binding or process.env |
| 25 | `src/lib/queries/interview-token.ts` | 224 | **Query options** — React Query wrappers |
| 26 | `src/components/interview-session-recording.tsx` | 41 | **Admin UI** — playback recorded sessions |
| 27 | `packages/db/schema.ts` | ~150 | **Schema** — interview_session, interview_response, cheating_event, interview_evaluation |
| 28 | `packages/db/enums.ts` | ~50 | **Enums** — DeliveryMode, InputMethod, CheatingEventType |
| 29 | `packages/db/repositories/interview-session-repository.ts` | 572 | **Repository** — all voice-related DB operations |
| 30 | `src/server.ts` | 21 | **Worker entry** — WS routing, DO/workflow exports |
| 31 | `apps/frontend/wrangler.jsonc` | 87 | **Cloudflare** — bindings (D1, DO, Workflows) |

---

## All Configuration Parameters

### 1. Session-level (`agentConfig` — JSON in `interviewSession.agentConfig`)

Set when creating an interview session via `POST /api/interview-sessions`:

```json
{
  "provider": "openai",
  "voice": "alloy",
  "language": "en",
  "instructions": "Custom instructions appended to the system prompt"
}
```

| Param | Type | Default | Options |
|-------|------|---------|---------|
| `provider` | string | `"openai"` | Always `"openai"` |
| `voice` | string | `"alloy"` | `alloy`, `ash`, `ballad`, `coral`, `sage`, `verse` |
| `language` | string | `undefined` | e.g. `"en"`, `"fr"` (not heavily used currently) |
| `instructions` | string | `undefined` | Injected into the AI system prompt at runtime |

### 2. OpenAI Realtime Session Parameters

Sent via `session.update` at connection time. Defined in
`packages/interview-realtime/prompts.ts` → `buildSessionUpdateEvent()`.

```json
{
  "type": "session.update",
  "session": {
    "model": "gpt-realtime-2",
    "output_modalities": ["audio"],
    "instructions": "...",
    "reasoning": { "effort": "low" },
    "truncation": {
      "type": "retention_ratio",
      "retention_ratio": 0.7,
      "token_limits": { "post_instructions": 6000 }
    },
    "audio": {
      "input": {
        "transcription": { "model": "whisper-1" },
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.6,
          "prefix_padding_ms": 400,
          "silence_duration_ms": 1100,
          "create_response": false,
          "interrupt_response": false
        }
      },
      "output": {
        "format": { "type": "pcm16", "rate": 24000 },
        "voice": "alloy"
      }
    }
  }
}
```

| Param | Value | Notes |
|-------|-------|-------|
| `model` | `"gpt-realtime-2"` | Hardcoded constant in `ai-config/realtime.ts` |
| `modalities` | `["audio"]` | Audio-only, no text output |
| `reasoning.effort` | `"low"` | Cheaper, faster. Options: `low`, `medium`, `high` |
| `truncation.type` | `"retention_ratio"` | Keeps last N% of context |
| `truncation.retention_ratio` | `0.7` | Keep last 70% of conversation history |
| `truncation.token_limits.post_instructions` | `6000` | Max tokens for system prompt |
| `audio.input.transcription.model` | `"whisper-1"` | Speech-to-text model |
| `audio.input.turn_detection.type` | `"server_vad"` | Server-side Voice Activity Detection |
| `audio.input.turn_detection.threshold` | `0.6` | VAD sensitivity (0.0 to 1.0) |
| `audio.input.turn_detection.prefix_padding_ms` | `400` | Audio to include before detected speech |
| `audio.input.turn_detection.silence_duration_ms` | `1100` | Silence required to detect end of speech |
| `audio.input.turn_detection.create_response` | `false` | DO explicitly controls when AI speaks |
| `audio.input.turn_detection.interrupt_response` | `false` | AI finishes speaking before VAD activates |
| `audio.output.format.type` | `"pcm16"` | 16-bit PCM audio |
| `audio.output.format.rate` | `24000` | 24 kHz sample rate |
| `audio.output.voice` | `"alloy"` | Overridden by `agentConfig.voice` if set |

### 3. Answer Evaluation Parameters

Defined in `packages/interview-realtime/answer-evaluation.ts`.

| Param | Value | Notes |
|-------|-------|-------|
| Evaluation model | `"gpt-4o-mini"` | Separate from `gpt-realtime-2` |
| Noise retry limit | `5` | Max follow-ups for unclear audio before auto-advance |
| Noise patterns | Filler words + artifacts | `"uh"`, `"um"`, `"hmm"`, `"inaudible"`, `"[inaudible]"`, `"you"`, `"thank you"` |
| Evaluation system prompt | `"Mark sufficient=true for ANY substantive spoken response — including wrong, off-topic, incomplete. Mark sufficient=false ONLY for noise."` | Relaxed grading |
| Intro evaluation model | Same `gpt-4o-mini` | Determines if candidate said "ready" |

### 4. Sideband Reconnection

Defined in `interview-session-do.ts`.

| Param | Value | Notes |
|-------|-------|-------|
| Max reconnect attempts | `5` | Exponential backoff |
| Max reconnect delay | `30000` (30s) | Between attempts |
| Reconnect backoff | Exponential | Jittered |

### 5. Cheating Event Rate Limiting

| Param | Value | Notes |
|-------|-------|-------|
| Rate limit | 1 event/sec per type | Prevents event flooding |
| Tracked types | `TAB_SWITCHED`, `WINDOW_BLUR`, `FULLSCREEN_EXITED`, `COPY_ATTEMPT`, `PASTE_ATTEMPT` | Stored in `cheating_event` table |

---

## Interview State Machine

```
         ┌──────────┐
         │   intro   │  Welcome + "Are you ready?"
         └─────┬─────┘
               │ candidate says "yes" / "ready"
               ▼
      ┌────────────────┐
      │ awaiting_ready  │  Confirm readiness (fallback: 2s timer)
      └───────┬────────┘
              │ confirmed ready
              ▼
       ┌──────────────┐
  ┌───►│  questions    │  Ask Q1 → evaluate → follow-up? → Q2 → ...
  │    └──────┬───────┘
  │           │ all questions asked
  │           ▼
  │     ┌──────────┐
  │     │  closing  │  Thank candidate, ask to click End Interview
  │     └─────┬────┘
  │           │
  │           ▼
  │  ┌───────────────┐
  └──┤ awaiting_end   │  Idle, waiting for END_INTERVIEW message
     └───────────────┘
```

### Phase behaviors

| Phase | AI Behavior | Candidate Action | Transitions |
|-------|-------------|------------------|-------------|
| `intro` | Speaks welcome message, asks "Are you ready?" | Speaks yes/no/ready | → `awaiting_ready` (on ready detection) |
| `awaiting_ready` | Waits for confirmation | Speaks | → `questions` (on confirmation) or → `intro` (2s fallback) |
| `questions` | Asks one question at a time, evaluates answer | Speaks answer | → `questions` (next question) or → `closing` (all done) |
| `closing` | Thanks candidate, instructs to end | Clicks End Interview button | → `awaiting_end` (after speaking) |
| `awaiting_end` | Silent | Button click sends `END_INTERVIEW` | → Interview complete |

### Per-question flow (within `questions` phase)

```
DO: response.create → AI speaks question
                      VAD stops (interrupt_response: false)
Candidate speaks → whisper-1 transcribes → DO receives text
DO: evaluateCandidateAnswer(text):
  ├── looksLikeNoise() → follow-up: "I didn't catch that..."
  │   ↓ (answer again)
  ├── maxNoiseRetries? → auto-advance to next question
  │
  └── gpt-4o-mini evaluation:
      ├── sufficient → acknowledge + advance to next question
      └── insufficient → follow-up question (up to 5 retries)
```

---

## End-to-End Connection Flow

### Phase 1: Session Creation (admin sets up interview)

```
POST /api/interview-sessions
  → Creates interview_session row in D1
  → deliveryMode: "voice" | "hybrid"
  → agentConfig: { voice, language, instructions }
  → Generates token for candidate access
```

### Phase 2: Candidate Arrives (browser loads page)

```
GET /interview/{token}
  → resolveInterviewToken() validates token
  → Shows mode picker (hybrid) or goes straight to voice
  → Shows welcome flow (welcome → instructions → landing)
```

### Phase 3: Start Voice Interview (11 sub-steps in useVoiceInterview.start())

```
1. requestFullscreen()
2. POST /api/interview-token/{token}/start-voice
   → Resolves session, loads questions/practice questions
   → buildRealtimeInstructions() → system prompt
   → createRealtimeEphemeralSession() → OpenAI ephemeral key
   → Returns: { clientSecret, wsUrl, questions, agentConfig }
3. getDisplayMedia({ audio: true }) → screen + system audio
4. getUserMedia({ audio: true, video: true }) → mic + camera
5. AudioContext.createMediaStreamDestination() → merge tracks
6. new MediaRecorder(mergedStream) → 1s chunks
7. new WebSocket(wsUrl) → connects to DO
8. new RTCPeerConnection() + addTrack(micAudio)
   → Creates data channel "oai-events"
9. pc.setLocalDescription() → SDP offer
   POST https://api.openai.com/v1/realtime/calls → SDP answer
   pc.setRemoteDescription(answer)
10. DO receives connection → opens sideband WS to OpenAI
    → Sends session.update (VAD, whisper-1, voice, instructions)
    → Sends response.create (welcome message)
11. Client sends CALL_STARTED { callId, clientSecret } to DO
```

### Phase 4: During Interview (data flow)

```
Candidate speaks
  → Mic → WebRTC → OpenAI whisper-1 transcribes
  → "input_audio_transcription.completed" event
  → Sideband WS → DO → DO processes transcript

DO → Client (WebSocket messages):
  CONNECTED          → session established
  INTRO_STARTED      → intro phase begins
  QUESTION_CHANGED   → new question displayed
  TRANSCRIPT_DELTA   → live transcript (per-word)
  TRANSCRIPT         → complete utterance
  ANSWER_SAVED       → answer persisted to D1
  ALL_QUESTIONS_ASKED → final question done
  INTERVIEW_COMPLETED → interview ended
  PRACTICE_ENDED     → practice session done
  ERROR              → error with details

Client → DO (WebSocket messages):
  CALL_STARTED       → { callId, clientSecret }
  REALTIME_EVENT     → forwarded OpenAI events from data channel
  CHEATING_EVENT     → { type, details }
  FULLSCREEN_STATE   → { isFullscreen }
  END_INTERVIEW      → candidate clicked End Interview
  PING               → keepalive
```

### Phase 5: Interview End

```
1. User clicks "End Interview" button
2. MediaRecorder.stop() → chunks assembled into Blob
3. POST /api/interview-token/{token}/upload-audio
   → Uploads .webm to Nextcloud
   → Updates sessionAudioUrl + sessionAudioPath in D1
4. DO receives END_INTERVIEW
   → Saves final state to DO storage + D1
   → Sends INTERVIEW_COMPLETED to client
5. InterviewEvaluationWorkflow triggered:
   → Loads all responses + cheating events from D1
   → gpt-4o-mini evaluates (structured output)
   → Persists score, recommendation, strengths, risks, feedback
```

---

## OpenAI Realtime Events (via sideband)

### Events the DO sends to OpenAI

| Event | Purpose |
|-------|---------|
| `session.update` | Configure VAD, whisper-1, TTS voice, instructions |
| `response.create` | Tell AI to speak (question, follow-up, acknowledgment) |
| `input_audio_buffer.clear` | Sometimes used to reset audio buffer |

### Events the DO receives from OpenAI

| Event | Contains | Used for |
|-------|----------|----------|
| `session.created` | Session ID | Confirmation |
| `session.updated` | Config confirmation | Debug |
| `response.created` | Response ID | Tracking |
| `response.audio_transcript.delta` | Text delta | Live transcript buildup |
| `response.audio_transcript.done` | Complete text | Full AI utterance logged |
| `response.done` | Response finished | Phase transitions |
| `response.audio.done` | Audio finished playing | Trigger VAD activation |
| `conversation.item.input_audio_transcription.completed` | Transcribed speech | **Primary input** — candidate's spoken words |
| `input_audio_buffer.speech_started` | Timestamp | Debug |
| `input_audio_buffer.speech_stopped` | Timestamp | Debug |
| `input_audio_buffer.committed` | Buffer item | Debug |
| `rate_limits.updated` | Rate limit info | Debug |
| `conversation.item.created` | Item details | Tracking |
| `error` | Error details | Error handling |

---

## Database Schema (voice-specific)

### `interview_session` (voice columns)

| Column | Type | Purpose |
|--------|------|---------|
| `delivery_mode` | text | `"form"`, `"voice"`, `"hybrid"` |
| `agent_config` | json | `{ provider, voice, language, instructions }` |
| `realtime_session_id` | text | OpenAI realtime session ID |
| `cheating_summary` | json | `{ tabSwitches, focusLostSeconds, fullscreenExits, copyAttempts, pasteAttempts }` |
| `session_audio_url` | text | Nextcloud URL to recording |
| `session_audio_path` | text | Nextcloud file path |
| `interrupted_at` | integer | Timestamp if interrupted |

### `interview_response` (voice columns)

| Column | Type | Purpose |
|--------|------|---------|
| `input_method` | text | `"voice"` for voice responses |
| `audio_url` | text | Not currently used |
| `transcript` | text | Full transcribed answer text |
| `transcript_confidence` | real | Whisper confidence (not currently used) |
| `realtime_event_id` | text | OpenAI event ID for traceability |

### `cheating_event`

| Column | Type | Purpose |
|--------|------|---------|
| `session_id` | text (FK) | Links to interview_session |
| `event_type` | text | `TAB_SWITCHED`, `WINDOW_BLUR`, `FULLSCREEN_EXITED`, `COPY_ATTEMPT`, `PASTE_ATTEMPT` |
| `timestamp` | integer | When event occurred |
| `metadata` | json | Additional event data |

### `interview_evaluation`

| Column | Type | Purpose |
|--------|------|---------|
| `session_id` | text (UNIQUE FK) | Links to interview_session |
| `score` | integer | 0-100 |
| `recommendation` | text | `strong_hire`, `hire`, `maybe`, `reject` |
| `summary` | text | AI-generated summary |
| `strengths` | json | `string[]` |
| `risks` | json | `string[]` |
| `dimension_scores` | json | `Record<string, number>` — per-dimension scores |
| `per_question_feedback` | json | `[{ questionId, feedback, score }]` |

---

## Environment Variables

Required in `apps/frontend/.env` / `apps/frontend/.dev.vars`:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | API key for Realtime API + Chat Completions |
| `NEXTCLOUD_URL` | WebDAV server URL for recording uploads |
| `NEXTCLOUD_USER` | Nextcloud username |
| `NEXTCLOUD_PASSWORD` | Nextcloud password/app-token |

---

## Cloudflare Bindings

Defined in `apps/frontend/wrangler.jsonc`:

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 | `hr-automation-db` — session, response, evaluation storage |
| `INTERVIEW_SESSION_DO` | Durable Object | `InterviewSessionDO` — real-time interview controller |
| `INTERVIEW_EVALUATION_WORKFLOW` | Workflow | Post-interview AI evaluation |

---

## Quick Reference: How to Change...

| Goal | File to Edit | What to Change |
|------|-------------|----------------|
| AI personality / tone | `packages/interview-realtime/prompts.ts` | `buildRealtimeInstructionBase()`, `buildSharedBehaviorSections()` |
| VAD sensitivity | `packages/interview-realtime/prompts.ts` | `turn_detection.threshold` in `buildSessionUpdateEvent()` |
| Silence duration before VAD triggers | `packages/interview-realtime/prompts.ts` | `silence_duration_ms` in `buildSessionUpdateEvent()` |
| TTS voice | `packages/interview-realtime/prompts.ts` | `audio.output.voice` in `buildSessionUpdateEvent()` |
| TTS voice per-session | DB column `agent_config.voice` | Set via `POST /api/interview-sessions` |
| Transcription model | `packages/interview-realtime/prompts.ts` | `audio.input.transcription.model` |
| Noise detection heuristics | `packages/interview-realtime/answer-evaluation.ts` | `looksLikeNoise()` patterns |
| Noise retry limit | `packages/interview-realtime/answer-evaluation.ts` | `NOISE_RETRY_LIMIT` (constant in DO) |
| Answer evaluation strictness | `packages/interview-realtime/answer-evaluation.ts` | `evaluateCandidateAnswer()` system prompt |
| Interview flow / phases | `src/durable-objects/interview-session-do.ts` | State machine transitions |
| Welcome message | `packages/interview-realtime/prompts.ts` | `buildWelcomeIntroEvent()` |
| Closing message | `packages/interview-realtime/prompts.ts` | `buildClosingEvent()` |
| UI layout / colors | `src/components/interview/VoiceInterview.tsx` | Component JSX |
| Anti-cheat events tracked | `src/hooks/useCheatingPrevention.ts` | Event listeners |
| Evaluation scoring | `src/workflows/interview-evaluation.ts` | Zod schema + system prompt |
| Connection timeout / retry | `src/durable-objects/interview-session-do.ts` | Sideband reconnection constants |
| Practice questions | `packages/interview-realtime/practice-questions.ts` | Question array |
| Context window size | `packages/interview-realtime/prompts.ts` | `truncation.retention_ratio` + `token_limits` |
| Reasoning effort (cost vs quality) | `packages/interview-realtime/prompts.ts` | `reasoning.effort` in `buildSessionUpdateEvent()` |
