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

interface ScheduleInterviewDialogProps {
  applicationId: string;
  application: {
    currentStage: number;
    rounds: Array<{
      id: string;
      name: string;
      stageOrder: number;
    }>;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  currentUserId: string;
}

export default function ScheduleInterviewDialog({
  applicationId,
  application,
  users,
  currentUserId,
}: ScheduleInterviewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [interviewerId, setInterviewerId] = useState(currentUserId);
  const [scheduledAt, setScheduledAt] = useState("");

  const currentRound = application.rounds.find(
    (r) => r.stageOrder === application.currentStage
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createInterview({
        applicationId,
        interviewerId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to schedule interview"
        );
      } else {
        toast.success("Interview scheduled successfully");
        router.push(`/applications/${applicationId}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred while scheduling the interview");
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
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview for Stage {application.currentStage}:{" "}
            {currentRound?.name || "Current Stage"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
                Scheduled Date & Time (Optional)
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
                Leave empty to schedule without a specific date
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

