import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { documents } from "@workspace/db/schema";
import slugify from "slugify";
import {
  createDocumentCategory,
  deleteDocumentCategory,
  getDocumentCategories,
  getDocumentCategoryById,
  getUnifiedDocuments,
  setDocumentCategories,
  updateDocumentCategory,
} from "@workspace/db/repositories/document-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  parseDocumentScope,
  type DocumentScope,
} from "@workspace/db/document-list-filters";
import {
  documentUploadInputSchema,
  type DocumentUploadInput,
} from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

type CreateDocumentRecordInput = DocumentUploadInput & {
  url: string;
  user: Actor;
};

type DocumentsIndexInput = {
  scope?: string;
  category?: string[];
  name?: string;
  tags?: string;
  candidateId?: string;
  page?: number;
};

export const documentsService = {
  async createRecord({
    name,
    description,
    categoryIds,
    url,
    tags,
    user,
  }: CreateDocumentRecordInput) {
    const result = documentUploadInputSchema.safeParse({
      name,
      description,
      categoryIds,
      tags,
    });

    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const validated = result.data;

    try {
      const [newDocument] = await db
        .insert(documents)
        .values({
          name: validated.name,
          slug: slugify(validated.name, { lower: true, strict: true }),
          description:
            validated.description && validated.description.trim() !== ""
              ? validated.description
              : null,
          url,
          tags: validated.tags.length > 0 ? validated.tags : null,
        })
        .returning();

      if (validated.categoryIds.length > 0 && newDocument) {
        await setDocumentCategories(newDocument.id, validated.categoryIds);
      }

      insertAuditLog({
        userId: user.id,
        action: "create_document",
        entityType: "document",
        entityId: newDocument?.id ?? "",
        details: {
          document: {
            id: newDocument?.id ?? "",
            name: newDocument?.name ?? "",
            slug: newDocument?.slug ?? "",
            description: newDocument?.description ?? "",
            url: newDocument?.url ?? "",
            tags: newDocument?.tags ?? [],
            createdAt: newDocument?.createdAt.toISOString() ?? "",
            updatedAt: newDocument?.updatedAt.toISOString() ?? "",
          },
          file: {
            name: validated.name,
            url,
          },
          createdBy: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true as const, data: newDocument };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create document" };
    }
  },

  async delete(id: string, actor: Actor) {
    try {
      const [documentData] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);

      await db.delete(documents).where(eq(documents.id, id));

      if (documentData) {
        insertAuditLog({
          userId: actor.id,
          action: "delete_document",
          entityType: "document",
          entityId: id,
          details: {
            document: {
              id: documentData.id,
              name: documentData.name,
              slug: documentData.slug,
              description: documentData.description,
              url: documentData.url,
              tags: documentData.tags,
            },
            deletedBy: {
              id: actor.id,
              email: actor.email,
              name: actor.name,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        }).catch((error) => console.error("Audit log error:", error));
      }

      return { success: true };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to delete document" };
    }
  },

  async index(deps: DocumentsIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const scope: DocumentScope = parseDocumentScope(deps.scope);

    const [categories, documentsResult] = await Promise.all([
      getDocumentCategories(),
      getUnifiedDocuments(
        scope,
        deps.category,
        deps.name,
        deps.tags,
        deps.candidateId,
        currentPage,
        limit,
      ),
    ]);

    const { documents, total } = documentsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      scope,
      categories,
      documents,
      currentPage,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        scope !== "all" ||
          deps.category?.length ||
          deps.name ||
          deps.candidateId,
      ),
    };
  },

  async createCategory(
    actor: Actor,
    name: string,
    description?: string,
  ) {
    if (!name || name.trim() === "") {
      return { error: "Category name is required" };
    }

    try {
      const newCategory = await createDocumentCategory(
        name.trim(),
        description?.trim() || undefined,
      );
      insertAuditLog({
        userId: actor.id,
        action: "create_document_category",
        entityType: "document_category",
        entityId: newCategory?.id || "",
        details: {
          category: {
            id: newCategory?.id || "",
            name: newCategory?.name || "",
            description: newCategory?.description || "",
            createdAt: newCategory?.createdAt.toISOString() || "",
            updatedAt: newCategory?.updatedAt.toISOString() || "",
          },
          input: {
            name: name.trim(),
            description: description?.trim() || null,
          },
          createdBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newCategory };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        if (
          error.message.includes("unique") ||
          error.message.includes("duplicate")
        ) {
          return { error: "A category with this name already exists" };
        }
        return { error: error.message };
      }

      return { error: "Failed to create category" };
    }
  },

  async updateCategory(
    actor: Actor,
    id: string,
    name: string,
    description?: string,
  ) {
    if (!name || name.trim() === "") {
      return { error: "Category name is required" };
    }

    try {
      const updatedCategory = await updateDocumentCategory(
        id,
        name.trim(),
        description?.trim() || undefined,
      );

      if (!updatedCategory) {
        return { error: "Category not found" };
      }
      insertAuditLog({
        userId: actor.id,
        action: "update_document_category",
        entityType: "document_category",
        entityId: id,
        details: {
          category: {
            id: updatedCategory.id,
            name: updatedCategory.name,
            description: updatedCategory.description || "",
            createdAt: updatedCategory.createdAt.toISOString(),
            updatedAt: updatedCategory.updatedAt.toISOString(),
          },
          input: {
            name: name.trim(),
            description: description?.trim() || null,
          },
          updatedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: updatedCategory };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        if (
          error.message.includes("unique") ||
          error.message.includes("duplicate")
        ) {
          return { error: "A category with this name already exists" };
        }
        return { error: error.message };
      }

      return { error: "Failed to update category" };
    }
  },

  async deleteCategory(actor: Actor, id: string) {
    try {
      const category = await getDocumentCategoryById(id);
      if (!category) {
        return { error: "Category not found" };
      }

      await deleteDocumentCategory(id);
      insertAuditLog({
        userId: actor.id,
        action: "delete_document_category",
        entityType: "document_category",
        entityId: id,
        details: {
          category: {
            id: category.id,
            name: category.name,
            description: category.description || "",
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
          },
          deletedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        if (
          error.message.includes("foreign key") ||
          error.message.includes("constraint")
        ) {
          return {
            error:
              "Cannot delete category because it is associated with one or more documents",
          };
        }
        return { error: error.message };
      }

      return { error: "Failed to delete category" };
    }
  },

  async listCategories() {
    try {
      const categories = await getDocumentCategories();
      return { success: true, data: categories };
    } catch (error) {
      console.error(error);
      return { error: "Failed to fetch categories" };
    }
  },
};
