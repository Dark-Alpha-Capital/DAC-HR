import { db } from "../db";
import { sql } from "drizzle-orm";
import type { ApplicationStatus } from "../application-status";
import {
  buildNormalizedStatusCase,
  getApplicationStatusesForKanbanColumn,
  kanbanColumnMatchesStatusFilter,
  normalizeApplicationStatus,
} from "../application-status";
import { decodeKanbanCursor, encodeKanbanCursor } from "../kanban-cursor";
import type { CandidateSortOption } from "../candidate-list-filters";

export type KanbanColumnCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  locationCity: string | null;
  locationState: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  position: { id: string; name: string } | null;
  applicationStatus: ApplicationStatus;
};

export type KanbanColumnFilters = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  source?: string[];
  sort?: CandidateSortOption;
};

export type KanbanColumnPage = {
  items: KanbanColumnCandidate[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
};

export const KANBAN_PAGE_SIZE_DEFAULT = 30;

const normalizedStatusExpr = sql.raw(buildNormalizedStatusCase());

type SqlFragment = ReturnType<typeof sql>;

function buildFilterFragments(filters: KanbanColumnFilters): SqlFragment[] {
  const fragments: SqlFragment[] = [];

  if (filters.name?.trim()) {
    const term = `%${filters.name.trim()}%`;
    fragments.push(
      sql`(kc.first_name LIKE ${term} OR kc.last_name LIKE ${term})`,
    );
  }

  if (filters.email?.trim()) {
    fragments.push(sql`kc.email LIKE ${`%${filters.email.trim()}%`}`);
  }

  if (filters.position?.length) {
    fragments.push(
      sql`EXISTS (
        SELECT 1 FROM candidate_position cp_filter
        WHERE cp_filter.candidate_id = kc.id
          AND cp_filter.position_id IN (${sql.join(
            filters.position.map((id) => sql`${id}`),
            sql`, `,
          )})
      )`,
    );
  }

  if (filters.source?.length) {
    fragments.push(
      sql`kc.source IN (${sql.join(
        filters.source.map((source) => sql`${source}`),
        sql`, `,
      )})`,
    );
  }

  if (filters.status?.length) {
    const normalizedStatuses = [
      ...new Set(
        filters.status
          .map((status) => normalizeApplicationStatus(status))
          .filter((status): status is ApplicationStatus => status !== null),
      ),
    ];

    if (normalizedStatuses.length > 0) {
      fragments.push(
        sql`kc.normalized_status IN (${sql.join(
          normalizedStatuses.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      );
    }
  }

  return fragments;
}

function combineSqlFragments(fragments: SqlFragment[]): SqlFragment | null {
  if (fragments.length === 0) {
    return null;
  }

  return sql.join(fragments, sql` AND `);
}

const latestApplicationCte = sql`
  latest_application AS (
    SELECT
      candidate_id,
      status,
      updated_at,
      ROW_NUMBER() OVER (
        PARTITION BY candidate_id
        ORDER BY updated_at DESC, id DESC
      ) AS rn
    FROM application
  )
`;

const kanbanCandidatesCte = sql`
  kanban_candidates AS (
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.location,
      c.location_city,
      c.location_state,
      c.source,
      c.source_url,
      c.note,
      c.created_at,
      c.updated_at,
      la.status AS application_status,
      COALESCE(la.updated_at, c.updated_at) AS kanban_sort_at,
      ${normalizedStatusExpr} AS normalized_status,
      (
        SELECT p.id
        FROM candidate_position cp
        INNER JOIN position p ON p.id = cp.position_id
        WHERE cp.candidate_id = c.id
        ORDER BY cp.created_at DESC
        LIMIT 1
      ) AS position_id,
      (
        SELECT p.name
        FROM candidate_position cp
        INNER JOIN position p ON p.id = cp.position_id
        WHERE cp.candidate_id = c.id
        ORDER BY cp.created_at DESC
        LIMIT 1
      ) AS position_name
    FROM candidate c
    LEFT JOIN latest_application la
      ON c.id = la.candidate_id AND la.rn = 1
  )
`;

function buildKanbanWhereClause(
  columnStatus: ApplicationStatus,
  filters: KanbanColumnFilters,
  cursor?: { updatedAt: string; id: string } | null,
): SqlFragment {
  const filterFragments = buildFilterFragments(filters);
  const clauses: SqlFragment[] = [sql`kc.normalized_status = ${columnStatus}`];

  const combinedFilters = combineSqlFragments(filterFragments);
  if (combinedFilters) {
    clauses.push(sql`(${combinedFilters})`);
  }

  if (cursor) {
    clauses.push(
      sql`(
        kc.kanban_sort_at < ${cursor.updatedAt}
        OR (kc.kanban_sort_at = ${cursor.updatedAt} AND kc.id < ${cursor.id})
      )`,
    );
  }

  return sql.join(clauses, sql` AND `);
}

type KanbanRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  source: string | null;
  source_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  application_status: string | null;
  kanban_sort_at: string | number;
  position_id: string | null;
  position_name: string | null;
};

function mapKanbanRow(row: KanbanRow): KanbanColumnCandidate {
  const applicationStatus: ApplicationStatus =
    normalizeApplicationStatus(row.application_status ?? "") ?? "ai_screening";

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    locationCity: row.location_city,
    locationState: row.location_state,
    source: row.source,
    sourceUrl: row.source_url,
    note: row.note,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    position: row.position_id
      ? { id: row.position_id, name: row.position_name ?? "" }
      : null,
    applicationStatus,
  };
}

export async function getKanbanColumnCandidates(
  columnStatus: ApplicationStatus,
  filters: KanbanColumnFilters = {},
  cursor?: string,
  limit: number = KANBAN_PAGE_SIZE_DEFAULT,
): Promise<KanbanColumnPage> {
  if (!kanbanColumnMatchesStatusFilter(columnStatus, filters.status)) {
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  const decodedCursor = cursor ? decodeKanbanCursor(cursor) : null;
  if (cursor && !decodedCursor) {
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  try {
    const countWhereClause = buildKanbanWhereClause(
      columnStatus,
      filters,
      null,
    );
    const whereClause = buildKanbanWhereClause(
      columnStatus,
      filters,
      decodedCursor,
    );

    const countResult = await db.all<{ total: number }>(sql`
      WITH ${latestApplicationCte},
      ${kanbanCandidatesCte}
      SELECT COUNT(*) AS total
      FROM kanban_candidates kc
      WHERE ${countWhereClause}
    `);

    const totalCount = Number(countResult[0]?.total ?? 0);

    const rows = await db.all<KanbanRow>(sql`
      WITH ${latestApplicationCte},
      ${kanbanCandidatesCte}
      SELECT
        kc.id,
        kc.first_name,
        kc.last_name,
        kc.email,
        kc.phone,
        kc.location,
        kc.location_city,
        kc.location_state,
        kc.source,
        kc.source_url,
        kc.note,
        kc.created_at,
        kc.updated_at,
        kc.application_status,
        kc.kanban_sort_at,
        kc.position_id,
        kc.position_name
      FROM kanban_candidates kc
      WHERE ${whereClause}
      ORDER BY kc.kanban_sort_at DESC, kc.id DESC
      LIMIT ${limit + 1}
    `);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map(mapKanbanRow);

    const lastRow = pageRows.at(-1);
    const nextCursor =
      hasMore && lastRow
        ? encodeKanbanCursor({
            updatedAt: String(lastRow.kanban_sort_at),
            id: lastRow.id,
          })
        : null;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching kanban column candidates", error);
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }
}

export async function getKanbanFilteredTotalCount(
  filters: KanbanColumnFilters = {},
): Promise<number> {
  try {
    const filterFragments = buildFilterFragments(filters);
    const combinedFilters = combineSqlFragments(filterFragments);
    const whereClause = combinedFilters ? sql`WHERE ${combinedFilters}` : sql``;

    const result = await db.all<{ total: number }>(sql`
      WITH ${latestApplicationCte},
      ${kanbanCandidatesCte}
      SELECT COUNT(*) AS total
      FROM kanban_candidates kc
      ${whereClause}
    `);

    return Number(result[0]?.total ?? 0);
  } catch (error) {
    console.error("Error fetching kanban filtered total count", error);
    return 0;
  }
}

// Re-export for tests / callers that need column status lists
export { getApplicationStatusesForKanbanColumn };
