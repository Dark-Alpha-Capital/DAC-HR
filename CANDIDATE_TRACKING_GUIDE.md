# Candidate Progress Tracking Guide

This guide explains how to track candidate progress through your hiring pipeline using the HR automation system.

## Overview

The system tracks candidates through multiple stages:

1. **Application** - Created when a candidate applies to a position
2. **Interviews** - Scheduled for each stage/round of the hiring process
3. **Feedback** - Collected for each question in an interview
4. **Stage Progression** - Automatically advances through stages

## Database Schema Flow

```
Candidate → Application → Interview → InterviewFeedback
                ↓
            Position → PositionRoundTemplates → RoundTemplate → Questions
```

## How It Works

### 1. Setting Up Positions and Rounds

Before tracking candidates, ensure you have:

- **Positions** created (e.g., "Software Engineer")
- **Round Templates** created (e.g., "Technical Interview", "HR Round")
- **Questions** added to round templates
- **Position-Round mappings** configured with stage orders

Example:

- Position: "Software Engineer"
- Stage 1: "Phone Screen" (Round Template)
- Stage 2: "Technical Interview" (Round Template)
- Stage 3: "Final Round" (Round Template)

### 2. Creating Applications

When a candidate is created with a position, an **Application** is automatically created:

- Status: `pending`
- Current Stage: `1` (first stage)

### 3. Scheduling Interviews

Use the `createInterview` action to schedule an interview:

```typescript
import { createInterview } from "@/lib/actions/create-interview";

await createInterview({
  applicationId: "app-id",
  interviewerId: "user-id", // The user conducting the interview
  scheduledAt: new Date("2024-01-15T10:00:00"), // Optional
});
```

This will:

- Create an interview linked to the current stage's round template
- Set application status to `interviewing` if it was `pending` or `reviewed`
- Link the interview to the appropriate position-round template

### 4. Submitting Interview Feedback

After an interview, submit feedback for each question:

```typescript
import { bulkCreateInterviewFeedback } from "@/lib/actions/create-interview-feedback";

await bulkCreateInterviewFeedback({
  interviewId: "interview-id",
  feedback: [
    {
      questionId: "question-1-id",
      notes: "Great answer, demonstrated strong problem-solving skills",
      rating: 5,
    },
    {
      questionId: "question-2-id",
      notes: "Needs improvement in communication",
      rating: 3,
    },
  ],
});
```

### 5. Completing Interviews and Advancing Stages

When an interview is completed:

```typescript
import { updateInterview } from "@/lib/actions/update-interview";

await updateInterview({
  interviewId: "interview-id",
  status: "completed",
  overallFeedback: "Strong candidate, recommend for next stage",
  advanceStage: true, // Automatically advances to next stage
});
```

This will:

- Mark the interview as `completed`
- Advance the application's `currentStage` to the next stage
- Keep the application status as `interviewing`

### 6. Updating Application Status

Manually update application status when needed:

```typescript
import { updateApplication } from "@/lib/actions/update-application";

await updateApplication({
  applicationId: "app-id",
  status: "hired", // or "rejected", "shortlisted", etc.
  currentStage: 3, // Optional: manually set stage
});
```

## Available Queries

### Get Candidate with Applications and Interviews

```typescript
import { getCandidateWithApplications } from "@workspace/db/queries";

const candidate = await getCandidateWithApplications(candidateId);
// Returns: candidate with applications array, each containing interviews array
```

### Get Application with Full Details

```typescript
import { getApplicationWithInterviews } from "@workspace/db/queries";

const application = await getApplicationWithInterviews(applicationId);
// Returns: application with position, rounds, and interviews
```

### Get Interview Details

```typescript
import { getInterviewById } from "@workspace/db/queries";

const interview = await getInterviewById(interviewId);
// Returns: interview with round template, questions, and feedback
```

## UI Components

The candidate detail page (`/candidates/[slug]`) now displays:

- Application status and current stage
- List of interviews with their status
- Interview dates and round information
- Visual indicators for interview status (scheduled/completed/cancelled)

## Workflow Example

1. **Create Candidate** → Application created automatically

   ```
   Status: pending, Stage: 1
   ```

2. **Schedule Stage 1 Interview**

   ```typescript
   createInterview({ applicationId, interviewerId, scheduledAt });
   ```

   ```
   Status: interviewing, Stage: 1
   Interview: scheduled
   ```

3. **Complete Interview & Submit Feedback**

   ```typescript
   bulkCreateInterviewFeedback({ interviewId, feedback });
   updateInterview({ interviewId, status: "completed", advanceStage: true });
   ```

   ```
   Status: interviewing, Stage: 2
   Interview: completed
   ```

4. **Schedule Stage 2 Interview**

   ```typescript
   createInterview({ applicationId, interviewerId }); // Uses currentStage (2)
   ```

5. **Final Decision**
   ```typescript
   updateApplication({ applicationId, status: "hired" });
   ```

## Next Steps

To fully utilize this system:

1. **Create UI for Scheduling Interviews**
   - Form to select interviewer and date
   - Display available rounds for current stage
   - Show interview calendar

2. **Create Interview Feedback Form**
   - Display questions for the round
   - Allow rating and notes for each question
   - Submit feedback after interview

3. **Create Application Detail Page**
   - Show full application timeline
   - Display all interviews and feedback
   - Allow stage progression and status updates

4. **Add Notifications**
   - Email notifications for scheduled interviews
   - Reminders for upcoming interviews
   - Status change notifications

5. **Add Analytics**
   - Track time in each stage
   - Average ratings per question
   - Conversion rates by stage

## Key Files

- **Queries**: `packages/db/queries.ts`
- **Actions**: `apps/web/lib/actions/`
  - `create-interview.ts`
  - `update-interview.ts`
  - `create-interview-feedback.ts`
  - `update-application.ts`
- **Schema**: `packages/db/schema.ts`
- **UI**: `apps/web/app/(main-site)/candidates/[slug]/page.tsx`

## Tips

- Always check if a `positionRoundTemplate` exists for the current stage before scheduling
- Use `advanceStage: true` when completing interviews to automatically progress
- The `currentStage` corresponds to `stageOrder` in `positionRoundTemplates`
- Interview feedback can be created/updated multiple times (upsert behavior)
- Application status can be manually updated at any time
