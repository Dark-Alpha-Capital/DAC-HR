"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { updateApplication } from "@/lib/actions/update-application";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "hired"
  | "rejected"
  | "withdrawn";

interface InlineApplicationStatusEditorProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
}

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const statusColors: Record<
  ApplicationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  reviewed: "secondary",
  shortlisted: "default",
  interviewing: "default",
  hired: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

export default function InlineApplicationStatusEditor({
  application,
}: InlineApplicationStatusEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === application.status) return;

    startTransition(async () => {
      const result = await updateApplication({
        applicationId: application.id,
        status: newStatus,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update application status"
        );
        return;
      }

      toast.success("Application status updated");
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          className="flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Change application status"
        >
          <Badge
            variant={statusColors[application.status]}
            className="text-xs h-5 cursor-pointer"
          >
            {statusLabels[application.status]}
          </Badge>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {Object.entries(statusLabels).map(([value, label]) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleStatusChange(value as ApplicationStatus)}
            className="cursor-pointer"
            disabled={value === application.status || isPending}
          >
            <div className="flex items-center gap-2 w-full">
              <Badge
                variant={statusColors[value as ApplicationStatus]}
                className="text-xs h-5"
              >
                {label}
              </Badge>
              {value === application.status && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Current
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

