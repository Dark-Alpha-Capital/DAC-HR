# CONTEXT.md — Domain glossary

Canonical terms for the HR automation platform. Use these names for modules and seams; keep this file current when naming a new module or sharpening a term.

## Recruiting

- **Candidate** — a person in the pipeline (`candidate`). May hold a **Profile**, **Onboarding** record, **Checklist**, **Documents**, and **AI Screenings**.
- **Application** — a Candidate's application to a **Position** (`application`, unique per `candidate_id` + `position_id`).
- **Position** — a role being hired for (`position`), owning its **Rounds** and **Screeners**.
- **Round** — a step in an interview process (`round_template`); a Position owns its rounds (each owns a copy, `position_id`).
- **Question** — a question in the bank (`question_bank`), linked to Rounds via `round_template_questions`.
- **Screener** — a pre-interview questionnaire template (`screener`), optionally tied to one Position (`position_id`).
- **Checklist** — per-Candidate to-do items (`candidate_checklist_item`).
- **Kanban** — the candidate pipeline board, filtered by application status with cursor pagination (`kanban-queries`).

## Interviews

- **Interview** — an application's interview for a Round (`interview`). One Interview has one **Session**.
- **Session** — a single candidate-facing interview instance (`interview_session`), either **form** or **voice** delivery; owns **Responses**, **Cheating events**, an **Evaluation**, and voice audio metadata.
- **Bundle** — a packaged sequence of Rounds delivered via a shareable token (`interview_bundle`, `interview_bundle_round`). Sessions belong to a Bundle or are standalone.
- **Response** — one answer to one question within a Session (`interview_response`).
- **Evaluation** — structured AI verdict on a Session (`interview_evaluation`, written by the interview-evaluation workflow).
- **AI Analysis** — structured AI verdict on an Interview or Bundle (`interview_ai_analysis`, admin-triggered or auto-run).

## Voice interview (realtime)

- The **realtime contract** lives in `packages/interview-realtime` (`ClientToDoMessage` / `DoToClientMessage`). The **Interview Session DO** orchestrates a voice Session; the client (hook + route) must speak the same typed protocol.

## Attendance

- **Meet Conference** — a Google Meet conference instance persisted from the signed-in user's account (`meet_conference`); **Meet Attendee** — one person observed (`meet_attendee`).

## Cross-cutting

- **Audit** — `audit_log` rows for mutations. One Audit module owns insert + query.
