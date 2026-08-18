import { normalizeListDeps } from "#/lib/query/normalize-deps";

const prismicKeys = {
  all: ["prismic"] as const,
  members: <T extends object>(deps: T) =>
    [...prismicKeys.all, "members", deps] as const,
  member: (uid: string, kind: string) =>
    [...prismicKeys.all, "member", uid, kind] as const,
};

export const queryKeys = {
  prismic: prismicKeys,
  candidates: {
    all: ["candidates"] as const,
    list: <T extends object>(deps: T) =>
      ["candidates", "list", normalizeListDeps(deps)] as const,
    detail: (uid: string) => ["candidates", "detail", uid] as const,
  },
  applications: {
    all: ["applications"] as const,
    list: <T extends object>(deps: T) =>
      ["applications", "list", normalizeListDeps(deps)] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: <T extends object>(deps: T) =>
      ["documents", "list", normalizeListDeps(deps)] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: <T extends object>(deps: T) =>
      ["employees", "list", normalizeListDeps(deps)] as const,
    detail: (id: string) => ["employees", "detail", id] as const,
  },
  positions: {
    all: ["positions"] as const,
    list: <T extends object>(deps: T) =>
      ["positions", "list", normalizeListDeps(deps)] as const,
  },
  rounds: {
    all: ["rounds"] as const,
    list: <T extends object>(deps: T) =>
      ["rounds", "list", normalizeListDeps(deps)] as const,
    byPosition: (positionId: string) =>
      ["rounds", "by-position", positionId] as const,
    detail: (id: string) => ["rounds", "detail", id] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: <T extends object>(deps: T) =>
      ["questions", "list", normalizeListDeps(deps)] as const,
  },
  admin: {
    all: ["admin"] as const,
    usersList: <T extends object>(deps: T) =>
      ["admin", "users", "list", normalizeListDeps(deps)] as const,
    auditLogs: <T extends object>(deps: T) =>
      ["admin", "audit-logs", "list", normalizeListDeps(deps)] as const,
  },
  weeklyCheckin: {
    all: ["weekly-checkin"] as const,
    records: <T extends object>(deps: T) =>
      ["weekly-checkin", "records", normalizeListDeps(deps)] as const,
  },
  imports: {
    all: ["imports"] as const,
    status: (id: string) => ["imports", "status", id] as const,
  },
  kanban: {
    all: ["kanban"] as const,
    column: <T extends object>(status: string, filters: T) =>
      ["kanban", status, normalizeListDeps(filters)] as const,
  },
  interviewToken: {
    all: ["interview-token"] as const,
    validate: (token: string) =>
      ["interview-token", "validate", token] as const,
    schema: (token: string, sessionId?: string) =>
      ["interview-token", "schema", token, sessionId ?? "current"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => ["dashboard", "stats"] as const,
  },
  screeners: {
    all: ["screeners"] as const,
    list: () => ["screeners", "list"] as const,
  },
  interviews: {
    all: ["interviews"] as const,
    bundleDetail: (bundleId: string) =>
      ["interviews", "bundle", bundleId] as const,
    bundleScreenings: (bundleId: string) =>
      ["interviews", "bundle", bundleId, "screenings"] as const,
    screenings: (interviewId: string) =>
      ["interviews", "detail", interviewId, "screenings"] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    meetings: <T extends object>(deps: T) =>
      ["attendance", "meetings", normalizeListDeps(deps)] as const,
    detail: (conferenceId: string) =>
      ["attendance", "detail", conferenceId] as const,
    stored: <T extends object>(deps: T) =>
      ["attendance", "stored", normalizeListDeps(deps)] as const,
  },
};
