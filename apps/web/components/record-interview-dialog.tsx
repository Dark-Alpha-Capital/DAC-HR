"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { createInterview } from "@/lib/actions/create-interview";
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
}

export default function RecordInterviewDialog({
  applicationId,
  application,
  users,
  currentUserId,
}: RecordInterviewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [interviewerId, setInterviewerId] = useState(currentUserId);
  const [positionRoundTemplateId, setPositionRoundTemplateId] = useState(
    application.rounds[0]?.positionRoundTemplateId || ""
  );
  const [scheduledAt, setScheduledAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!positionRoundTemplateId) {
      toast.error("Please select a round");
      return;
    }

    setLoading(true);

    try {
      const result = await createInterview({
        applicationId,
        positionRoundTemplateId,
        interviewerId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to record interview"
        );
      } else {
        toast.success("Interview recorded successfully");
        router.push(`/applications/${applicationId}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred while recording the interview");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    router.push(`/applications/${applicationId}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                    <SelectItem key={round.positionRoundTemplateId} value={round.positionRoundTemplateId}>
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
            <Button type="button" variant="outline" onClick={handleClose}>
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

