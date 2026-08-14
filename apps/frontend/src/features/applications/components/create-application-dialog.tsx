import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createApplication } from "~/lib/actions/create-application";
import { loadPositionOptions } from "~/lib/loaders/positions";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";

interface CreateApplicationDialogProps {
  candidateId: string;
  existingPositionIds: string[];
  variant?: "header" | "empty-state";
}

export function CreateApplicationDialog({
  candidateId,
  existingPositionIds,
  variant = "header",
}: CreateApplicationDialogProps) {
  const invalidate = useQueryInvalidation();
  const [open, setOpen] = useState(false);
  const [positionId, setPositionId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["position-options"],
    queryFn: () => loadPositionOptions(),
    enabled: open,
  });

  const availablePositions = useMemo(
    () =>
      positions.filter((position) => !existingPositionIds.includes(position.id)),
    [positions, existingPositionIds],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPositionId("");
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!positionId) {
      toast.error("Please select a position");
      return;
    }

    setLoading(true);

    try {
      const result = await createApplication({
        data: { candidateId, positionId },
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Application created");
      handleOpenChange(false);
      await Promise.all([
        invalidate.candidateDetail(candidateId),
        invalidate.applicationLists(),
      ]);
    } catch {
      toast.error("An error occurred while creating the application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === "empty-state" ? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Application
          </Button>
        ) : (
          <Button variant="secondary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Application</DialogTitle>
          <DialogDescription>
            Select a position to create a new application for this candidate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={positionId}
                onValueChange={setPositionId}
                disabled={positionsLoading || availablePositions.length === 0}
                required
              >
                <SelectTrigger id="position">
                  <SelectValue
                    placeholder={
                      positionsLoading
                        ? "Loading positions..."
                        : availablePositions.length === 0
                          ? "No positions available"
                          : "Select a position"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availablePositions.length === 0 && !positionsLoading ? (
                <p className="text-xs text-muted-foreground">
                  This candidate already has applications for all positions.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                positionsLoading ||
                !positionId ||
                availablePositions.length === 0
              }
            >
              {loading ? "Creating..." : "Create Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
