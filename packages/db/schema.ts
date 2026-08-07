import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { type InferSelectModel } from "drizzle-orm";
import type {
  ApplicationStatus,
  CandidateDocumentCategory,
  CandidateImportDuplicatePolicy,
  CandidateImportRowStatus,
  CandidateImportStatus,
  CandidateImportType,
  Department,
  DocumentCategoryValue,
  HireLevel,
  AgentConfig,
  CheatingSummary,
  DeliveryMode,
  InputMethod,
  CheatingEventType,
  InterviewEvaluationRecommendation,
  InterviewBundleRoundStatus,
  InterviewBundleStatus,
  InterviewMode,
  InterviewSessionStatus,
  InterviewStatus,
  RoundDeliveryMode,
  Personality,
  PositionStatus,
  QuestionCategory,
  QuestionType,
} from "./enums";
import type { QuestionOption } from "./question-types";

const uuidPk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAtCol = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAtCol = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const position = sqliteTable("position", {
  id: uuidPk(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  department: text("department", { mode: "json" }).$type<Department[]>(),
  hireLevel: text("hire_level").$type<HireLevel>(),
  status: text("status").$type<PositionStatus>().default("active").notNull(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type Position = InferSelectModel<typeof position>;

export const candidate = sqliteTable("candidate", {
  id: uuidPk(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  location: text("location"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  source: text("source"),
  sourceUrl: text("source_url"),
  note: text("note"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type Candidate = InferSelectModel<typeof candidate>;

export const candidateDocument = sqliteTable("candidate_document", {
  id: uuidPk(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category")
    .$type<CandidateDocumentCategory>()
    .default("other")
    .notNull(),
  url: text("url").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  fileSearchDocumentName: text("file_search_document_name"),
  vectorizeNamespace: text("vectorize_namespace"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
export type CandidateDocument = InferSelectModel<typeof candidateDocument>;

export const candidateProfile = sqliteTable("candidate_profile", {
  id: uuidPk(),
  candidateId: text("candidate_id")
    .notNull()
    .unique()
    .references(() => candidate.id, { onDelete: "cascade" }),
  school: text("school"),
  major: text("major"),
  graduationYear: integer("graduation_year"),
  linkedinUrl: text("linkedin_url"),
  resumeText: text("resume_text"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type CandidateProfile = InferSelectModel<typeof candidateProfile>;

export const candidateImport = sqliteTable("candidate_import", {
  id: uuidPk(),
  filename: text("filename").notNull(),
  type: text("type").$type<CandidateImportType>().notNull(),
  status: text("status")
    .$type<CandidateImportStatus>()
    .default("pending")
    .notNull(),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  originalFileUrl: text("original_file_url").notNull(),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  duplicatePolicy: text("duplicate_policy")
    .$type<CandidateImportDuplicatePolicy>()
    .default("skip")
    .notNull(),
  totalCandidates: integer("total_candidates").default(0).notNull(),
  processedCandidates: integer("processed_candidates").default(0).notNull(),
  failedCandidates: integer("failed_candidates").default(0).notNull(),
  error: text("error"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type CandidateImport = InferSelectModel<typeof candidateImport>;

export const candidateImportRow = sqliteTable(
  "candidate_import_row",
  {
    id: uuidPk(),
    importId: text("import_id")
      .notNull()
      .references(() => candidateImport.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    candidateId: text("candidate_id").references(() => candidate.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<CandidateImportRowStatus>()
      .default("pending")
      .notNull(),
    error: text("error"),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    importRowUnique: uniqueIndex("candidate_import_row_unique").on(
      table.importId,
      table.rowIndex,
    ),
  }),
);

export type CandidateImportRow = InferSelectModel<typeof candidateImportRow>;

export const candidatePosition = sqliteTable(
  "candidate_position",
  {
    id: uuidPk(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    positionId: text("position_id")
      .notNull()
      .references(() => position.id, { onDelete: "cascade" }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    candidatePositionUnique: uniqueIndex("candidate_position_unique").on(
      table.candidateId,
      table.positionId,
    ),
  }),
);

export const questionBank = sqliteTable("question_bank", {
  id: uuidPk(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type")
    .$type<QuestionType>()
    .default("text")
    .notNull(),
  category: text("question_category").$type<QuestionCategory>(),
  options: text("options", { mode: "json" }).$type<QuestionOption[] | null>(),
  timeLimitSeconds: integer("time_limit_seconds"),
  orderIndex: integer("order_index"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type Question = InferSelectModel<typeof questionBank>;

export const roundTemplate = sqliteTable("round_template", {
  id: uuidPk(),
  positionId: text("position_id")
    .notNull()
    .references(() => position.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type RoundTemplate = InferSelectModel<typeof roundTemplate>;

export const roundTemplateQuestions = sqliteTable("round_template_questions", {
  id: uuidPk(),
  roundTemplateId: text("round_template_id")
    .notNull()
    .references(() => roundTemplate.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionBank.id, { onDelete: "cascade" }),
});

export const application = sqliteTable(
  "application",
  {
    id: uuidPk(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    positionId: text("position_id")
      .notNull()
      .references(() => position.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<ApplicationStatus>()
      .default("ai_screening")
      .notNull(),
    personality: text("personality").$type<Personality>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    appCandidatePositionUnique: uniqueIndex("app_candidate_position_unique").on(
      table.candidateId,
      table.positionId,
    ),
  }),
);

export const interview = sqliteTable("interview", {
  id: uuidPk(),
  applicationId: text("application_id")
    .notNull()
    .references(() => application.id, { onDelete: "cascade" }),
  roundId: text("round_id")
    .notNull()
    .references(() => roundTemplate.id, { onDelete: "cascade" }),
  interviewerId: text("interviewer_id").references(() => user.id, {
    onDelete: "set null",
  }),
  mode: text("mode").$type<InterviewMode>().default("manual").notNull(),
  status: text("status").$type<InterviewStatus>().default("pending").notNull(),
  rating: integer("rating"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
  overallFeedback: text("overall_feedback"),
  createdAt: createdAtCol(),
});

export const interviewFeedback = sqliteTable(
  "interview_feedback",
  {
    id: uuidPk(),
    interviewId: text("interview_id").references(() => interview.id, {
      onDelete: "cascade",
    }),
    questionId: text("question_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    notes: text("notes"),
    rating: integer("rating"),
  },
  (table) => ({
    interviewFeedbackUnique: uniqueIndex("interview_feedback_unique").on(
      table.interviewId,
      table.questionId,
    ),
  }),
);

export const documents = sqliteTable("documents", {
  id: uuidPk(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category")
    .$type<DocumentCategoryValue>()
    .default("other")
    .notNull(),
  url: text("url").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type Document = InferSelectModel<typeof documents>;

export const documentCategories = sqliteTable("document_categories", {
  id: uuidPk(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type DocumentCategory = InferSelectModel<typeof documentCategories>;

export const documentCategoryRelations = sqliteTable(
  "document_category_relations",
  {
    id: uuidPk(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => documentCategories.id, { onDelete: "cascade" }),
    createdAt: createdAtCol(),
  },
);

export type DocumentCategoryRelation = InferSelectModel<
  typeof documentCategoryRelations
>;

export const candidateOnboarding = sqliteTable("candidate_onboarding", {
  id: uuidPk(),
  candidateId: text("candidate_id")
    .notNull()
    .unique()
    .references(() => candidate.id, { onDelete: "cascade" }),
  contractSigned: integer("contract_signed", { mode: "boolean" })
    .default(false)
    .notNull(),
  signedContractDocumentId: text("signed_contract_document_id").references(
    () => candidateDocument.id,
    { onDelete: "set null" },
  ),
  contractSignedAt: integer("contract_signed_at", { mode: "timestamp_ms" }),
  emailProvided: integer("email_provided", { mode: "boolean" })
    .default(false)
    .notNull(),
  emailRegisteredAt: integer("email_registered_at", { mode: "timestamp_ms" }),
  onboardingPacketSent: integer("onboarding_packet_sent", { mode: "boolean" })
    .default(false)
    .notNull(),
  onboardingPacketSentAt: integer("onboarding_packet_sent_at", {
    mode: "timestamp_ms",
  }),
  companyEmailActivate: integer("company_email_activate", { mode: "boolean" })
    .default(false)
    .notNull(),
  companyEmailActivateAt: integer("company_email_activate_at", {
    mode: "timestamp_ms",
  }),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const employee = sqliteTable("employee", {
  id: uuidPk(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  department: text("department", { mode: "json" })
    .$type<Department[]>()
    .notNull(),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  profileImage: text("profile_image"),
  bio: text("bio"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type Employee = InferSelectModel<typeof employee>;

export const auditLog = sqliteTable("audit_log", {
  id: uuidPk(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type AuditLog = InferSelectModel<typeof auditLog>;

export const candidateAiScreening = sqliteTable("candidate_ai_screening", {
  id: uuidPk(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  applicationId: text("application_id").references(() => application.id, {
    onDelete: "set null",
  }),
  analysis: text("analysis").notNull(),
  structuredData: text("structured_data", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  model: text("model").default("gpt-4o-mini"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
export type CandidateAiScreening = InferSelectModel<
  typeof candidateAiScreening
>;

export const screener = sqliteTable(
  "screener",
  {
    id: uuidPk(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    positionId: text("position_id").references(() => position.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    positionUnique: uniqueIndex("screener_position_unique").on(
      table.positionId,
    ),
  }),
);
export type Screener = InferSelectModel<typeof screener>;

export const candidateChecklistItem = sqliteTable("candidate_checklist_item", {
  id: uuidPk(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  checked: integer("checked", { mode: "boolean" }).default(false).notNull(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
export type CandidateChecklistItem = InferSelectModel<
  typeof candidateChecklistItem
>;

export const interviewAiAnalysis = sqliteTable("interview_ai_analysis", {
  id: uuidPk(),
  interviewId: text("interview_id")
    .notNull()
    .references(() => interview.id, { onDelete: "cascade" }),
  bundleId: text("bundle_id").references(() => interviewBundle.id, {
    onDelete: "cascade",
  }),
  applicationId: text("application_id").references(() => application.id, {
    onDelete: "set null",
  }),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  screenerId: text("screener_id").references(() => screener.id, {
    onDelete: "set null",
  }),
  analysis: text("analysis").notNull(),
  structuredData: text("structured_data", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  customPrompt: text("custom_prompt"),
  model: text("model").default("gpt-4o-mini"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
export type InterviewAiAnalysis = InferSelectModel<typeof interviewAiAnalysis>;

export const recruiterWeeklyCheckin = sqliteTable("recruiter_weekly_checkin", {
  id: uuidPk(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weekStartDate: integer("week_start_date", { mode: "timestamp_ms" }).notNull(),
  weekEndDate: integer("week_end_date", { mode: "timestamp_ms" }).notNull(),
  recruiterName: text("recruiter_name").notNull(),
  positionsWorked: text("positions_worked", { mode: "json" }).$type<string[]>(),
  candidatesSourced: integer("candidates_sourced").default(0),
  candidatesScreened: integer("candidates_screened").default(0),
  candidatesRejected: integer("candidates_rejected").default(0),
  candidatesAdvanced2ndRound: integer("candidates_advanced_2nd_round").default(
    0,
  ),
  candidatesAdvanced3rdRound: integer("candidates_advanced_3rd_round").default(
    0,
  ),
  offersExtended: integer("offers_extended").default(0),
  offersAccepted: integer("offers_accepted").default(0),
  bestPerformingChannels: text("best_performing_channels", {
    mode: "json",
  }).$type<string[]>(),
  avgTimeToScreen: text("avg_time_to_screen"),
  delaysOrBottlenecks: text("delays_or_bottlenecks"),
  concernsOrEscalations: text("concerns_or_escalations"),
  supportNeeded: text("support_needed"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type RecruiterWeeklyCheckin = InferSelectModel<
  typeof recruiterWeeklyCheckin
>;

export const interviewBundle = sqliteTable("interview_bundle", {
  id: uuidPk(),
  token: text("token").notNull().unique(),
  applicationId: text("application_id")
    .notNull()
    .references(() => application.id, { onDelete: "cascade" }),
  status: text("status")
    .$type<InterviewBundleStatus>()
    .default("pending")
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type InterviewBundle = InferSelectModel<typeof interviewBundle>;

export const interviewSession = sqliteTable("interview_session", {
  id: uuidPk(),
  token: text("token").notNull().unique(),
  interviewId: text("interview_id")
    .notNull()
    .references(() => interview.id, { onDelete: "cascade" }),
  applicationId: text("application_id")
    .notNull()
    .references(() => application.id, { onDelete: "cascade" }),
  bundleId: text("bundle_id").references(() => interviewBundle.id, {
    onDelete: "cascade",
  }),
  roundId: text("round_id")
    .notNull()
    .references(() => roundTemplate.id, { onDelete: "cascade" }),
  status: text("status")
    .$type<InterviewSessionStatus>()
    .default("pending")
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  tabSwitches: integer("tab_switches").default(0).notNull(),
  deliveryMode: text("delivery_mode")
    .$type<DeliveryMode>()
    .default("hybrid")
    .notNull(),
  agentConfig: text("agent_config", { mode: "json" }).$type<AgentConfig>(),
  realtimeSessionId: text("realtime_session_id"),
  cheatingSummary: text("cheating_summary", {
    mode: "json",
  }).$type<CheatingSummary>(),
  sessionAudioUrl: text("session_audio_url"),
  sessionAudioPath: text("session_audio_path"),
  interruptedAt: integer("interrupted_at", { mode: "timestamp_ms" }),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type InterviewSession = InferSelectModel<typeof interviewSession>;

export const interviewBundleRound = sqliteTable(
  "interview_bundle_round",
  {
    id: uuidPk(),
    bundleId: text("bundle_id")
      .notNull()
      .references(() => interviewBundle.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => roundTemplate.id, { onDelete: "cascade" }),
    roundOrder: integer("round_order").notNull(),
    deliveryMode: text("delivery_mode").$type<RoundDeliveryMode>().notNull(),
    interviewId: text("interview_id")
      .notNull()
      .references(() => interview.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSession.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<InterviewBundleRoundStatus>()
      .default("pending")
      .notNull(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    bundleRoundUnique: uniqueIndex("interview_bundle_round_unique").on(
      table.bundleId,
      table.roundId,
    ),
  }),
);

export type InterviewBundleRound = InferSelectModel<
  typeof interviewBundleRound
>;

export const interviewResponse = sqliteTable(
  "interview_response",
  {
    id: uuidPk(),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSession.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    answerText: text("answer_text"),
    selectedOptionId: text("selected_option_id"),
    inputMethod: text("input_method").$type<InputMethod>(),
    audioUrl: text("audio_url"),
    transcript: text("transcript"),
    transcriptConfidence: real("transcript_confidence"),
    realtimeEventId: text("realtime_event_id"),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => ({
    interviewResponseUnique: uniqueIndex("interview_response_unique").on(
      table.sessionId,
      table.questionId,
    ),
  }),
);

export type InterviewResponse = InferSelectModel<typeof interviewResponse>;

export const cheatingEvent = sqliteTable(
  "cheating_event",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSession.id, { onDelete: "cascade" }),
    eventType: text("event_type").$type<CheatingEventType>().notNull(),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
  },
  (table) => ({
    cheatingEventSessionTimestampIdx: index(
      "cheating_event_session_timestamp_idx",
    ).on(table.sessionId, table.timestamp),
  }),
);

export type CheatingEvent = InferSelectModel<typeof cheatingEvent>;

export const interviewEvaluation = sqliteTable("interview_evaluation", {
  id: uuidPk(),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => interviewSession.id, { onDelete: "cascade" }),
  score: integer("score"),
  recommendation:
    text("recommendation").$type<InterviewEvaluationRecommendation>(),
  summary: text("summary"),
  strengths: text("strengths", { mode: "json" }).$type<unknown>(),
  risks: text("risks", { mode: "json" }).$type<unknown>(),
  dimensionScores: text("dimension_scores", { mode: "json" }).$type<unknown>(),
  perQuestionFeedback: text("per_question_feedback", {
    mode: "json",
  }).$type<unknown>(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export type InterviewEvaluation = InferSelectModel<typeof interviewEvaluation>;

/** One Google Meet conference instance (persisted firm attendance). */
export const meetConference = sqliteTable(
  "meet_conference",
  {
    id: text("id").primaryKey(),
    googleResourceName: text("google_resource_name").notNull(),
    title: text("title").notNull(),
    meetingCode: text("meeting_code"),
    spaceName: text("space_name"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    /** UTC calendar day `YYYY-MM-DD` derived from starts_at */
    attendanceDate: text("attendance_date").notNull(),
    syncedByUserId: text("synced_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    index("meet_conference_attendance_date_idx").on(table.attendanceDate),
  ],
);

export type MeetConference = InferSelectModel<typeof meetConference>;

/** One person observed on a Meet conference. */
export const meetAttendee = sqliteTable(
  "meet_attendee",
  {
    id: text("id").primaryKey(),
    conferenceId: text("conference_id")
      .notNull()
      .references(() => meetConference.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    googleUserId: text("google_user_id"),
    /** signedin | anonymous | phone | unknown */
    kind: text("kind").notNull().default("unknown"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }),
    leftAt: integer("left_at", { mode: "timestamp_ms" }),
    durationMs: integer("duration_ms"),
    /**
     * Stable dedupe key: `user:{googleUserId}` or `name:{kind}:{displayName}`.
     */
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: createdAtCol(),
  },
  (table) => [
    uniqueIndex("meet_attendee_conference_dedupe_uidx").on(
      table.conferenceId,
      table.dedupeKey,
    ),
  ],
);

export type MeetAttendee = InferSelectModel<typeof meetAttendee>;
