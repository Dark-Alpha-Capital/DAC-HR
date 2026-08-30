import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  Loader2,
  Mail,
  MailX,
  RotateCcw,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { formatDateTime } from "#/lib/utils";
import { interviewBundleEmailsQueryOptions } from "#/features/interviews/interview-queries";
import { renderBundleEmailPreview } from "#/features/interviews/server/queries/interviews";
import { resendInterviewInvite } from "#/features/interviews/server/mutations/interviews";
import { queryKeys } from "#/lib/query/query-keys";
import type { BundleInviteEmail } from "#/features/interviews/server/interviews-service";

const statusBadge = {
  sent: {
    label: "Sent",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0",
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0",
  },
  processing: {
    label: "Processing",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
  },
  dispatched: {
    label: "Dispatched",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
  },
} satisfies Record<
  BundleInviteEmail["status"],
  { label: string; className: string }
>;

function EmailRow({
  email,
  onPreview,
  onCopy,
  onResend,
  resending,
}: {
  email: BundleInviteEmail;
  onPreview: (email: BundleInviteEmail) => void;
  onCopy: (email: BundleInviteEmail) => void;
  onResend: (email: BundleInviteEmail) => void;
  resending: boolean;
}) {
  const badge = statusBadge[email.status];
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{email.subject || "Interview invitation"}</span>
          <Badge className={badge.className}>{badge.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground break-all">
          To: {email.to}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(new Date(email.createdAt))}
          {email.status === "failed"
            ? " — delivery failed, click Resend to retry"
            : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="secondary" size="icon" title="Preview email" onClick={() => onPreview(email)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" title="Copy link" onClick={() => onCopy(email)}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          title="Resend email"
          disabled={resending}
          onClick={() => onResend(email)}
        >
          {resending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function BundleEmailsTab({ bundleId }: { bundleId: string }) {
  const queryClient = useQueryClient();
  const [previewEmail, setPreviewEmail] = useState<BundleInviteEmail | null>(
    null,
  );
  const [preview, setPreview] = useState<{
    subject: string;
    html: string;
    to: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    interviewBundleEmailsQueryOptions(bundleId),
  );
  const emails = data ?? [];

  const handlePreview = async (email: BundleInviteEmail) => {
    setPreviewEmail(email);
    setPreview(null);
    setLoadingPreview(true);
    try {
      const result = await renderBundleEmailPreview({ data: bundleId });
      if (result.preview) {
        setPreview(result.preview);
      } else {
        toast.error("Could not render email preview");
      }
    } catch {
      toast.error("Failed to render email preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCopy = async (email: BundleInviteEmail) => {
    try {
      await navigator.clipboard.writeText(email.interviewUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleResend = async (email: BundleInviteEmail) => {
    setResendingId(email.id);
    try {
      const result = await resendInterviewInvite({ data: bundleId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Invite email re-sent to ${email.to}`);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.interviews.bundleEmails(bundleId),
        });
      }
    } catch {
      toast.error("Failed to resend invite email");
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <MailX className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No invite emails have been sent for this interview yet. Generate an AI
          link with "Send invite email" enabled to email the candidate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="h-4 w-4" />
        {emails.length} invite email{emails.length !== 1 ? "s" : ""} sent to
        this candidate for this interview
      </div>
      <div className="space-y-3">
        {emails.map((email) => (
          <EmailRow
            key={email.id}
            email={email}
            onPreview={handlePreview}
            onCopy={handleCopy}
            onResend={handleResend}
            resending={resendingId === email.id}
          />
        ))}
      </div>

      <Dialog open={previewEmail !== null} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-all">
              {preview?.subject ?? "Email preview"}
            </DialogTitle>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : preview ? (
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[560px] w-full rounded-md border"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Could not render preview.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
