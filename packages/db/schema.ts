import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
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
    .$onUpdate(() => /* @__PURE__ */ new Date())
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

export const position = pgTable("position", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  onboardingTitle: text("onboarding_title"),
  onboardingMessage: text("onboarding_message"),
  onboardingInstructions: text("onboarding_instructions"),
  onboardingDocumentIds: text("onboarding_document_ids").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const candidate = pgTable("candidate", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  source: text("source"),
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
  ["resume", "cover-letter", "portfolio", "other"]
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type CandidateDocument = InferSelectModel<typeof candidateDocument>;

export const candidatePosition = pgTable("candidate_position", {
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
});

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

export const roundTemplate = pgTable("round_template", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "Technical Interview"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

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
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "reviewed",
  "shortlisted",
  "interviewing",
  "hired",
  "rejected",
  "withdrawn",
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
  status: applicationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// An *instance* of a candidate's application in a specific round
export const interview = pgTable("interview", {
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
});

// The *specific feedback* for each question asked in that interview
export const interviewFeedback = pgTable("interview_feedback", {
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
});

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
