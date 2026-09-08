import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { createRound } from "#/features/rounds/server/mutations/create-round";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";

interface CreateRoundDialogProps {
  positionId: string;
  positionName: string;
  variant?: "header" | "empty-state";
}

export function CreateRoundDialog({
  positionId,
  positionName,
  variant = "header",
}: CreateRoundDialogProps) {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setNameError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError("Round name is required.");
      return;
    }
    setNameError(null);

    setLoading(true);

    try {
      const result = await createRound({
        data: {
          name: name.trim(),
          description: description.trim(),
          positionId,
        },
      });

      if (result.error) {
        toast.error(
          z.string().safeParse(result.error).data || "Failed to create round",
        );
        return;
      }

      toast.success("Round created");
      handleOpenChange(false);
      await Promise.all([
        router.invalidate(),
        invalidate.roundLists(),
        invalidate.positionLists(),
      ]);
    } catch {
      toast.error("An error occurred while creating the round");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === "empty-state" ? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create round
          </Button>
        ) : (
          <Button variant="secondary" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add round
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create round</DialogTitle>
          <DialogDescription>
            Add an interview round for {positionName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-4">
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="round-name">Round name</FieldLabel>
              <Input
                id="round-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="e.g. Screening/Recruiter Round"
                aria-invalid={Boolean(nameError)}
                required
              />
              {nameError ? <FieldError>{nameError}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="round-description">Description</FieldLabel>
              <Textarea
                id="round-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about this round"
                rows={4}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create round"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
