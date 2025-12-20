"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/document-category-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import type { DocumentCategory } from "@workspace/db/schema";

interface DocumentCategoriesManagerProps {
  categories: DocumentCategory[];
}

export default function DocumentCategoriesManager({
  categories: initialCategories,
}: DocumentCategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [isPending, startTransition] = useTransition();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleAddCategory = () => {
    setFormData({ name: "", description: "" });
    setSelectedCategory(null);
    setIsAddDialogOpen(true);
  };

  const handleEditCategory = (category: DocumentCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCategory = (category: DocumentCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await createCategory(
          formData.name,
          formData.description || undefined
        );

        if (result.success && result.data) {
          setCategories([...categories, result.data]);
          setIsAddDialogOpen(false);
          setFormData({ name: "", description: "" });
          toast.success("Category created successfully");
        } else {
          toast.error(result.error || "Failed to create category");
        }
      } catch (error) {
        toast.error("Failed to create category");
      }
    });
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    startTransition(async () => {
      try {
        const result = await updateCategory(
          selectedCategory.id,
          formData.name,
          formData.description || undefined
        );

        if (result.success && result.data) {
          const updatedCategory = result.data;
          setCategories(
            categories.map((cat) =>
              cat.id === selectedCategory.id ? updatedCategory : cat
            )
          );
          setIsEditDialogOpen(false);
          setSelectedCategory(null);
          setFormData({ name: "", description: "" });
          toast.success("Category updated successfully");
        } else {
          toast.error(result.error || "Failed to update category");
        }
      } catch (error) {
        toast.error("Failed to update category");
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;

    startTransition(async () => {
      try {
        const result = await deleteCategory(selectedCategory.id);

        if (result.success) {
          setCategories(
            categories.filter((cat) => cat.id !== selectedCategory.id)
          );
          setIsDeleteDialogOpen(false);
          setSelectedCategory(null);
          toast.success("Category deleted successfully");
        } else {
          toast.error(result.error || "Failed to delete category");
        }
      } catch (error) {
        toast.error("Failed to delete category");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Document Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage document categories that can be assigned to documents
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitAdd}>
              <DialogHeader>
                <DialogTitle>Add Document Category</DialogTitle>
                <DialogDescription>
                  Create a new category for organizing documents
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel htmlFor="add-name">Name</FieldLabel>
                  <Input
                    id="add-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Job Description"
                    required
                    disabled={isPending}
                  />
                  <FieldDescription>
                    A unique name for this category
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="add-description">Description</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id="add-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description"
                      rows={3}
                      disabled={isPending}
                    />
                  </InputGroup>
                </Field>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No categories found. Create your first category to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {category.description || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(category.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit Document Category</DialogTitle>
              <DialogDescription>
                Update the category information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field>
                <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Job Description"
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                    rows={3}
                    disabled={isPending}
                  />
                </InputGroup>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This
              action cannot be undone. If this category is associated with any
              documents, the deletion will fail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
