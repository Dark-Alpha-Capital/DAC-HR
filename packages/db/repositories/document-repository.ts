import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { ilike, jsonArrayTagSearch } from "../sqlite-helpers";
import {
  candidateDocument,
  documentCategories,
  documentCategoryRelations,
  documents,
} from "../schema";

export async function getDocuments(
  categoryFilters?: string[],
  nameSearch?: string,
  tagsSearch?: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  documents: Array<{
    id: string;
    name: string;
    url: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    categories: Array<{
      id: string;
      name: string;
    }>;
  }>;
  total: number;
}> {
  try {
    let query = db
      .select({
        document: documents,
      })
      .from(documents);

    const conditions = [];

    if (categoryFilters && categoryFilters.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${documentCategoryRelations}
          WHERE ${documentCategoryRelations.documentId} = ${documents.id}
          AND ${documentCategoryRelations.categoryId} IN (${sql.join(
            categoryFilters.map((id) => sql`${id}`),
            sql`, `,
          )})
        )`,
      );
    }

    if (nameSearch && nameSearch.trim()) {
      const searchTerm = `%${nameSearch.trim()}%`;
      conditions.push(ilike(documents.name, searchTerm));
    }

    if (tagsSearch && tagsSearch.trim()) {
      conditions.push(
        jsonArrayTagSearch(documents.tags, tagsSearch.trim().toLowerCase()),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const allResults = await query.orderBy(desc(documents.createdAt));
    const total = allResults.length;

    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    const documentsWithCategories = await Promise.all(
      paginatedResults.map(async (result) => {
        const categories = await getDocumentCategoriesByDocumentId(
          result.document.id,
        );
        return {
          ...result.document,
          tags: result.document.tags || [],
          categories,
        };
      }),
    );

    return { documents: documentsWithCategories, total };
  } catch (error) {
    console.error("Error fetching documents", error);
    return { documents: [], total: 0 };
  }
}

export async function getDocumentsByCandidateId(candidateId: string) {
  try {
    const results = await db
      .select()
      .from(candidateDocument)
      .where(eq(candidateDocument.candidateId, candidateId));
    return results;
  } catch (error) {
    console.error("Error fetching documents by candidate id", error);
    return [];
  }
}

export async function getDocumentCategories() {
  try {
    const results = await db
      .select()
      .from(documentCategories)
      .orderBy(asc(documentCategories.name));
    return results;
  } catch (error) {
    console.error("Error fetching document categories", error);
    return [];
  }
}

export async function getDocumentCategoryById(id: string) {
  try {
    const [result] = await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.id, id))
      .limit(1);
    return result || null;
  } catch (error) {
    console.error("Error fetching document category", error);
    return null;
  }
}

export async function createDocumentCategory(
  name: string,
  description?: string,
) {
  try {
    const [result] = await db
      .insert(documentCategories)
      .values({
        name,
        description: description || null,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("Error creating document category", error);
    throw error;
  }
}

export async function updateDocumentCategory(
  id: string,
  name: string,
  description?: string,
) {
  try {
    const [result] = await db
      .update(documentCategories)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(documentCategories.id, id))
      .returning();
    return result;
  } catch (error) {
    console.error("Error updating document category", error);
    throw error;
  }
}

export async function deleteDocumentCategory(id: string) {
  try {
    await db.delete(documentCategories).where(eq(documentCategories.id, id));
  } catch (error) {
    console.error("Error deleting document category", error);
    throw error;
  }
}

export async function getDocumentCategoriesByDocumentId(documentId: string) {
  try {
    const results = await db
      .select({
        id: documentCategories.id,
        name: documentCategories.name,
        description: documentCategories.description,
        createdAt: documentCategories.createdAt,
        updatedAt: documentCategories.updatedAt,
      })
      .from(documentCategoryRelations)
      .innerJoin(
        documentCategories,
        eq(documentCategoryRelations.categoryId, documentCategories.id),
      )
      .where(eq(documentCategoryRelations.documentId, documentId));
    return results;
  } catch (error) {
    console.error("Error fetching document categories", error);
    return [];
  }
}

export async function setDocumentCategories(
  documentId: string,
  categoryIds: string[],
) {
  try {
    await db
      .delete(documentCategoryRelations)
      .where(eq(documentCategoryRelations.documentId, documentId));

    if (categoryIds.length > 0) {
      await db.insert(documentCategoryRelations).values(
        categoryIds.map((categoryId) => ({
          documentId,
          categoryId,
        })),
      );
    }
  } catch (error) {
    console.error("Error setting document categories", error);
    throw error;
  }
}
