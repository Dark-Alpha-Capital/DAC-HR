import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { emailTemplateQueryOptions } from "#/features/email-templates/query-options";
import { saveEmailTemplate } from "#/features/email-templates/server/mutations/email-templates";
import {
  substituteTemplate,
  EMAIL_TEMPLATE_VARIABLES,
  DEFAULT_INTERVIEW_INVITE_TEMPLATE,
} from "@workspace/mail";

const SAMPLE_VALUES = {
  candidateName: "Jane Doe",
  positionName: "Analyst",
  link: "https://recruiting.darkalphacapital.com/interview/abc123",
  expiresAt: "August 10, 2026 at 12:00 PM",
};

type TemplateField = "subject" | "message";

export function EmailTemplatesPage() {
  const invalidate = useQueryInvalidation();
  const { data, isLoading } = useQuery(
    emailTemplateQueryOptions("interview-invite"),
  );
  const [subject, setSubject] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<TemplateField>("message");
  const [saving, setSaving] = useState(false);

  const subjectTemplate = subject ?? data?.subjectTemplate ?? "";
  const bodyTemplate = message ?? data?.bodyTemplate ?? "";

  const templateIsEmpty = subjectTemplate.trim() === "";

  if (isLoading && !data) {
    return (
      <div className="container mx-auto flex max-w-2xl items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const previewSubject = substituteTemplate(
    subjectTemplate || DEFAULT_INTERVIEW_INVITE_TEMPLATE.subjectTemplate,
    SAMPLE_VALUES,
  );
  const previewMessage = substituteTemplate(
    bodyTemplate || DEFAULT_INTERVIEW_INVITE_TEMPLATE.bodyTemplate,
    SAMPLE_VALUES,
  );

  const handleSave = async () => {
    const nextSubject = subjectTemplate.trim();
    const nextBody = bodyTemplate.trim();
    if (!nextSubject || !nextBody) {
      toast.error("Subject and message are required");
      return;
    }
    setSaving(true);
    try {
      const result = await saveEmailTemplate({
        data: {
          type: "interview-invite",
          subjectTemplate: nextSubject,
          bodyTemplate: nextBody,
        },
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Interview invite email template saved");
        setSubject(null);
        setMessage(null);
        void invalidate.emailTemplates();
      }
    } catch {
      toast.error("Failed to save email template");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (token: string) => {
    if (activeField === "subject") {
      setSubject((prev) => `${prev ?? data?.subjectTemplate ?? ""} ${token}`);
    } else {
      setMessage((prev) => `${prev ?? bodyTemplate} ${token}`);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          Configure the interview-invite email sent to candidates when you
          generate an AI interview link. Changes apply to every future invite
          and pre-fill the "Customize email" section in the send dialog.
        </p>
      </header>

      <div className="space-y-5 rounded-lg border p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h2 className="text-sm font-semibold">
            Interview Invite{" "}
            <span className="font-normal text-muted-foreground">
              (interview-invite)
            </span>
          </h2>
        </div>

        <div className="space-y-1.5">
          <Label>Variables</Label>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
              <button
                key={variable.token}
                type="button"
                title={variable.description}
                onClick={() => insertVariable(variable.token)}
                className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted/70"
              >
                {variable.token}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click a variable to insert it into the focused field — it will be
            replaced with the real value when the email is sent.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="template-subject">Subject</Label>
          <Input
            id="template-subject"
            value={subjectTemplate}
            onFocus={() => setActiveField("subject")}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Interview invitation — {positionName}"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="template-message">
            Message (rendered above the "Start my interview" button)
          </Label>
          <Textarea
            id="template-message"
            value={bodyTemplate}
            onFocus={() => setActiveField("message")}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="We were impressed by your background and would like you to complete a short interview for the {positionName} position…"
          />
        </div>

        <div className="space-y-2 rounded-md bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Live preview (sample values)
          </p>
          <p className="text-sm font-medium">Subject: {previewSubject}</p>
          <p className="text-sm text-muted-foreground">
            Hi {SAMPLE_VALUES.candidateName},
          </p>
          <p className="text-sm text-muted-foreground">
            {templateIsEmpty
              ? DEFAULT_INTERVIEW_INVITE_TEMPLATE.bodyTemplate
              : previewMessage}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data?.updatedAt
              ? `Last updated ${new Date(data.updatedAt).toLocaleString()}`
              : "Using the built-in default template (not customized yet)."}
          </p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save template
          </Button>
        </div>
      </div>
    </div>
  );
}
