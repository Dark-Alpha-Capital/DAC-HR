import { normalizeListDeps } from "~/lib/query/normalize-deps";

const prismicKeys = {
  all: ["prismic"] as const,
  members: (deps: Record<string, unknown>) =>
    [...prismicKeys.all, "members", deps] as const,
  member: (uid: string, kind: string) =>
    [...prismicKeys.all, "member", uid, kind] as const,
};

export const queryKeys = {
  prismic: prismicKeys,
  candidates: {
    all: ["candidates"] as const,
    list: (deps: Record<string, unknown>) =>
      ["candidates", "list", normalizeListDeps(deps)] as const,
    detail: (uid: string) => ["candidates", "detail", uid] as const,
  },
  applications: {
    all: ["applications"] as const,
    list: (deps: Record<string, unknown>) =>
      ["applications", "list", normalizeListDeps(deps)] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: (deps: Record<string, unknown>) =>
      ["documents", "list", normalizeListDeps(deps)] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: (deps: Record<string, unknown>) =>
      ["employees", "list", normalizeListDeps(deps)] as const,
    detail: (id: string) => ["employees", "detail", id] as const,
  },
  positions: {
    all: ["positions"] as const,
    list: (deps: Record<string, unknown>) =>
      ["positions", "list", normalizeListDeps(deps)] as const,
  },
  rounds: {
    all: ["rounds"] as const,
    list: (deps: Record<string, unknown>) =>
      ["rounds", "list", normalizeListDeps(deps)] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: (deps: Record<string, unknown>) =>
      ["questions", "list", normalizeListDeps(deps)] as const,
  },
  admin: {
    all: ["admin"] as const,
    usersList: (deps: Record<string, unknown>) =>
      ["admin", "users", "list", normalizeListDeps(deps)] as const,
    auditLogs: (deps: Record<string, unknown>) =>
      ["admin", "audit-logs", "list", normalizeListDeps(deps)] as const,
  },
  weeklyCheckin: {
    all: ["weekly-checkin"] as const,
    records: (deps: Record<string, unknown>) =>
      ["weekly-checkin", "records", normalizeListDeps(deps)] as const,
  },
  imports: {
    all: ["imports"] as const,
    status: (id: string) => ["imports", "status", id] as const,
  },
  kanban: {
    all: ["kanban"] as const,
    column: (status: string, filters: Record<string, unknown>) =>
      ["kanban", status, normalizeListDeps(filters)] as const,
  },
};
