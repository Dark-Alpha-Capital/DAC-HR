import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  json,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, type InferSelectModel } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const departmentEnum = pgEnum("department", [
  "management",
  "capital-markets",
  "deal-team",
  "legal",
  "operations",
  "origination",
  "pipe",
  "public-markets",
]);

export const hireLevelEnum = pgEnum("hire_level", [
  "managing-director",
  "vice-president",
  "associate",
  "analyst",
  "intern",
]);

export const positionStatusEnum = pgEnum("position_status", [
  "active",
  "hold",
  "passed",
  "upcoming",
]);

export const position = pgTable("position", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  department: departmentEnum("department").array(),
  hireLevel: hireLevelEnum("hire_level"),
  status: positionStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Position = InferSelectModel<typeof position>;

export const candidate = pgTable("candidate", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  location: text("location"),
  source: text("source"),
  sourceUrl: text("source_url"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Candidate = InferSelectModel<typeof candidate>;

export const candidateDocumentCategoryEnum = pgEnum(
  "candidate_document_category",
  ["resume", "cover-letter", "portfolio", "other"],
);

export const candidateDocument = pgTable("candidate_document", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: candidateDocumentCategoryEnum("category")
    .default("other")
    .notNull(),
  url: text("url").notNull(),
  tags: text("tags").array(),
  fileSearchDocumentName: text("file_search_document_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type CandidateDocument = InferSelectModel<typeof candidateDocument>;

export const candidatePosition = pgTable(
  "candidate_position",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    positionId: text("position_id")
      .notNull()
      .references(() => position.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    candidatePositionUnique: uniqueIndex("candidate_position_unique").on(
      table.candidateId,
      table.positionId,
    ),
  }),
);

export const questionBank = pgTable("question_bank", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  questionText: text("question_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Question = InferSelectModel<typeof questionBank>;

export const roundTemplate = pgTable("round_template", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Technical Interview"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type RoundTemplate = InferSelectModel<typeof roundTemplate>;

export const positionRoundTemplates = pgTable("position_round_templates", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  positionId: text("position_id")
    .notNull()
    .references(() => position.id, { onDelete: "cascade" }),
  roundTemplateId: text("round_template_id")
    .notNull()
    .references(() => roundTemplate.id, { onDelete: "cascade" }),
});

// JOIN 2: Links a Round Template to its Questions
// This defines the set of questions for a specific type of round
export const roundTemplateQuestions = pgTable("round_template_questions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roundTemplateId: text("round_template_id")
    .notNull()
    .references(() => roundTemplate.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionBank.id, { onDelete: "cascade" }),
});

export const interviewStatusEnum = pgEnum("interview_status", [
  "pending",
  "move_forward",
  "rejected",
  "scheduled",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "ai_screening",
  "first_round_recruiter_call",
  "second_round_technical_screening",
  "third_round_final_ceo",
  "contract_offer",
  "onboarding",
  "rejected",
  "withdrawn",
]);

export const personalityEnum = pgEnum("personality", [
  "ENFJ",
  "ENFP",
  "ENTJ",
  "ENTP",
  "ESFJ",
  "ESFP",
  "ESTJ",
  "ESTP",
  "INFJ",
  "INTJ",
  "INTP",
  "ISFJ",
  "ISFP",
  "ISTJ",
  "ISTP",
]);

export const application = pgTable("application", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  positionId: text("position_id")
    .notNull()
    .references(() => position.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").default("ai_screening").notNull(),
  personality: personalityEnum("personality"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// An *instance* of a candidate's application in a specific round
export const interview = pgTable(
  "interview",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: text("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    // This links to the round template for this position
    positionRoundTemplateId: text("position_round_template_id")
      .notNull()
      .references(() => positionRoundTemplates.id, { onDelete: "cascade" }),
    interviewerId: text("interviewer_id") // The User who is conducting it
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    status: interviewStatusEnum("status").default("pending").notNull(),
    rating: integer("rating"), // Rating from 1 to 5
    scheduledAt: timestamp("scheduled_at"),
    overallFeedback: text("overall_feedback"), // Interviewer's final summary
    proceedToNextRound: boolean("proceed_to_next_round"), // Whether candidate should proceed to next round (for screening and technical rounds)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    interviewRoundUnique: uniqueIndex("interview_round_unique").on(
      table.applicationId,
      table.positionRoundTemplateId,
    ),
  }),
);

// The *specific feedback* for each question asked in that interview
export const interviewFeedback = pgTable(
  "interview_feedback",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    interviewId: text("interview_id")
      .notNull()
      .references(() => interview.id, { onDelete: "cascade" }),
    questionId: text("question_id") // The question from the bank
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    notes: text("notes"), // The interviewer's notes on the answer
    rating: integer("rating"), // Optional score, e.g., 1-5
  },
  (table) => ({
    interviewFeedbackUnique: uniqueIndex("interview_feedback_unique").on(
      table.interviewId,
      table.questionId,
    ),
  }),
);

export const documentCategoryEnum = pgEnum("document_category", [
  "job-description",
  "onboarding",
  "policy",
  "hr-form",
  "other",
]);

export const documents = pgTable("documents", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: documentCategoryEnum("category").default("other").notNull(),
  url: text("url").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Document = InferSelectModel<typeof documents>;

// Document Categories table for editable categories
export const documentCategories = pgTable("document_categories", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type DocumentCategory = InferSelectModel<typeof documentCategories>;

// Junction table for many-to-many relationship between documents and categories
export const documentCategoryRelations = pgTable(
  "document_category_relations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => documentCategories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export type DocumentCategoryRelation = InferSelectModel<
  typeof documentCategoryRelations
>;

export const candidateOnboarding = pgTable("candidate_onboarding", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  candidateId: text("candidate_id")
    .notNull()
    .unique()
    .references(() => candidate.id, { onDelete: "cascade" }),
  contractSigned: boolean("contract_signed").default(false).notNull(),
  signedContractDocumentId: text("signed_contract_document_id").references(
    () => candidateDocument.id,
    { onDelete: "set null" },
  ),
  contractSignedAt: timestamp("contract_signed_at"),
  emailProvided: boolean("email_provided").default(false).notNull(),
  emailRegisteredAt: timestamp("email_registered_at"),
  onboardingPacketSent: boolean("onboarding_packet_sent")
    .default(false)
    .notNull(),
  onboardingPacketSentAt: timestamp("onboarding_packet_sent_at"),
  companyEmailActivate: boolean("company_email_activate")
    .default(false)
    .notNull(),
  companyEmailActivateAt: timestamp("company_email_activate_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const employee = pgTable("employee", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  department: departmentEnum("department").array().notNull(),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  profileImage: text("profile_image"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Employee = InferSelectModel<typeof employee>;

export const auditLog = pgTable("audit_log", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type AuditLog = InferSelectModel<typeof auditLog>;

export const candidateAiScreening = pgTable("candidate_ai_screening", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  applicationId: text("application_id").references(() => application.id, {
    onDelete: "set null",
  }),
  analysis: text("analysis").notNull(), // The full AI analysis markdown text
  structuredData: json("structured_data"), // Structured AI analysis data: { verdict, score (0-10), explanation, fullAnalysis }
  model: text("model").default("gemini-2.5-flash"), // Which AI model was used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type CandidateAiScreening = InferSelectModel<
  typeof candidateAiScreening
>;

export const interviewAiAnalysis = pgTable("interview_ai_analysis", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  interviewId: text("interview_id")
    .notNull()
    .references(() => interview.id, { onDelete: "cascade" }),
  applicationId: text("application_id").references(() => application.id, {
    onDelete: "set null",
  }),
  positionId: text("position_id").references(() => position.id, {
    onDelete: "set null",
  }),
  analysis: text("analysis").notNull(),
  structuredData: json("structured_data"),
  customPrompt: text("custom_prompt"),
  model: text("model").default("gemini-2.5-flash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type InterviewAiAnalysis = InferSelectModel<typeof interviewAiAnalysis>;

export const sourcingChannelEnum = pgEnum("sourcing_channel", [
  "linkedin",
  "indeed",
  "upwork",
  "handshake",
  "internal-referrals",
  "university-portals",
  "agency",
  "other",
]);

export const recruiterWeeklyCheckin = pgTable("recruiter_weekly_checkin", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  recruiterName: text("recruiter_name").notNull(),
  positionsWorked: text("positions_worked").array(),
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
  bestPerformingChannels: text("best_performing_channels").array(),
  avgTimeToScreen: text("avg_time_to_screen"),
  delaysOrBottlenecks: text("delays_or_bottlenecks"),
  concernsOrEscalations: text("concerns_or_escalations"),
  supportNeeded: text("support_needed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type RecruiterWeeklyCheckin = InferSelectModel<
  typeof recruiterWeeklyCheckin
>;
