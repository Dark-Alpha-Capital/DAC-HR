import {
  defineAction,
  defineArgsAction,
  defineQueryWithInput,
} from "./create-action";
import {
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
  getDocumentCategories,
  getDocumentCategoryById,
} from "@workspace/db/repositories/document-repository";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createCategory = defineArgsAction(async (name: string, description?: string) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (!name || name.trim() === "") {
    return { error: "Category name is required" };
  }

  try {
    const newCategory = await createDocumentCategory(
      name.trim(),
      description?.trim() || undefined,
    );
    insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
      // Check for unique constraint violation
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
});

export const updateCategory = defineArgsAction(async (
  id: string,
  name: string,
  description?: string,
) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

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
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
      // Check for unique constraint violation
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
});

export const deleteCategory = defineAction(async (id: string) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get category before deleting for audit log
    const category = await getDocumentCategoryById(id);
    if (!category) {
      return { error: "Category not found" };
    }

    await deleteDocumentCategory(id);
    insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
      // Check for foreign key constraint violation
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
});

export const getAllCategories = defineQueryWithInput(async () => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    const categories = await getDocumentCategories();
    return { success: true, data: categories };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch categories" };
  }
});
