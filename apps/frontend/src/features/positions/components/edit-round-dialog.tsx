import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { updateRound } from "#/features/rounds/server/mutations/update-round";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";

interface EditRoundDialogProps {
  round: { id: string; name: string; description: string | null };
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

export function EditRoundDialog({
  round,
  onSaved,
  trigger,
}: EditRoundDialogProps) {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(round.name);
  const [description, setDescription] = useState(round.description ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(round.name);
      setDescription(round.description ?? "");
    }
  }, [open, round.name, round.description]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Round name is required");
      return;
    }

    setLoading(true);

    try {
      const result = await updateRound({
        data: [
          round.id,
          {
            name: name.trim(),
            description: description.trim(),
          },
        ],
      });

      if (result.error) {
        const parsedError = z.string().safeParse(result.error);
        toast.error(
          parsedError.success ? parsedError.data : "Failed to update round",
        );
        return;
      }

      toast.success("Round updated");
      setOpen(false);
      await Promise.all([
        router.invalidate(),
        invalidate.roundLists(),
        invalidate.positionLists(),
      ]);
      onSaved?.();
    } catch {
      toast.error("An error occurred while updating the round");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Edit round"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit round</DialogTitle>
          <DialogDescription>
            Update the interview round details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-round-name">Round name</Label>
              <Input
                id="edit-round-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Screening/Recruiter Round"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-round-description">Description</Label>
              <Textarea
                id="edit-round-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about this round"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
