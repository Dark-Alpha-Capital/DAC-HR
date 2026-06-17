import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createInterview } from "~/lib/actions/create-interview";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface RecordInterviewDialogProps {
  applicationId: string;
  application: {
    rounds: Array<{
      id: string;
      name: string;
      positionRoundTemplateId: string;
    }>;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPositionRoundTemplateId?: string;
}

export default function RecordInterviewDialog({
  applicationId,
  application,
  users,
  currentUserId,
  open,
  onOpenChange,
  initialPositionRoundTemplateId,
}: RecordInterviewDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [interviewerId, setInterviewerId] = useState(currentUserId);
  const [positionRoundTemplateId, setPositionRoundTemplateId] = useState(
    initialPositionRoundTemplateId ||
      application.rounds[0]?.positionRoundTemplateId ||
      "",
  );
  const [scheduledAt, setScheduledAt] = useState("");

  // Update positionRoundTemplateId when initialPositionRoundTemplateId changes
  useEffect(() => {
    if (initialPositionRoundTemplateId) {
      setPositionRoundTemplateId(initialPositionRoundTemplateId);
    }
  }, [initialPositionRoundTemplateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!positionRoundTemplateId) {
      toast.error("Please select a round");
      return;
    }

    setLoading(true);

    try {
      const result = await createInterview({
        data: {
          applicationId,
          positionRoundTemplateId,
          interviewerId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to record interview",
        );
      } else {
        toast.success("Interview recorded successfully");
        onOpenChange(false);
        router.invalidate();
      }
    } catch (error) {
      toast.error("An error occurred while recording the interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Interview</DialogTitle>
          <DialogDescription>
            Record an interview that has been conducted for this application
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="round">Round</Label>
              <Select
                value={positionRoundTemplateId}
                onValueChange={setPositionRoundTemplateId}
                required
              >
                <SelectTrigger id="round">
                  <SelectValue placeholder="Select a round" />
                </SelectTrigger>
                <SelectContent>
                  {application.rounds.map((round) => (
                    <SelectItem
                      key={round.positionRoundTemplateId}
                      value={round.positionRoundTemplateId}
                    >
                      {round.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewer">Interviewer</Label>
              <Select
                value={interviewerId}
                onValueChange={setInterviewerId}
                required
              >
                <SelectTrigger id="interviewer">
                  <SelectValue placeholder="Select an interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">
                Interview Date & Time (Optional)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When the interview took place (or leave empty)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Interview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
