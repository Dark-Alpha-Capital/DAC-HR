import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Switch } from "#/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { loadPositionOptions } from "#/features/positions/server/queries/positions";
import {
  contractSendTargetsQueryOptions,
  contractTemplatesQueryOptions,
} from "#/features/contracts/query-options";
import {
  deleteContractTemplate,
  sendContractForReview,
  updateContractTemplate,
} from "#/features/contracts/server/mutations/contracts";
import { getContractStatusLabel } from "#/features/contracts/constants";
import { CONTRACT_CORE_TOKENS } from "#/features/contracts/helpers";
import { getApplicationStatusLabel } from "#/lib/application-status";
import type { HireLevel } from "#/lib/enums";
import type { ContractTemplateUpdateInput } from "#/features/contracts/schemas";

type PositionOption = { id: string; name: string };
type ContractTemplateRow = {
  id: string;
  name: string;
  positionId: string | null;
  positionName: string | null;
  hireLevel: HireLevel | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
type SendTarget = {
  applicationId: string;
  applicationStatus: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  contract: {
    id: string;
    status: string;
    version: number;
    sentAt: Date | null;
    openedAt: Date | null;
    receiptAffirmedAt: Date | null;
  } | null;
};

const formatDate = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "—";

export function ContractsPage({
  initialTab = "send",
}: {
  initialTab?: "send" | "templates";
}) {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
        <p className="text-sm text-muted-foreground">
          Send contracts for review and manage the contract templates used for
          each position and hire level.
        </p>
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="send">Send for review</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="space-y-4 pt-4">
          <SendTab />
        </TabsContent>
        <TabsContent value="templates" className="space-y-4 pt-4">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------- Send for review

function SendTab() {
  const invalidate = useQueryInvalidation();
  const [positionId, setPositionId] = useState<string>("");
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);

  const positionsQuery = useQuery({
    queryKey: ["positions", "options"],
    queryFn: loadPositionOptions,
  });
  const positions: PositionOption[] = positionsQuery.data ?? [];

  const targetsQuery = useQuery(
    contractSendTargetsQueryOptions(positionId),
  );
  const targets: SendTarget[] = targetsQuery.data ?? [];

  const handleSent = async () => {
    setSendTarget(null);
    void invalidate.contracts();
  };

  if (positionsQuery.isLoading) {
    return <CenteredSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Position</Label>
          <Select value={positionId} onValueChange={setPositionId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Choose a position" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((position) => (
                <SelectItem key={position.id} value={position.id}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!positionId ? (
        <p className="text-sm text-muted-foreground">
          Choose a position to see every candidate who applied and their
          contract status.
        </p>
      ) : null}

      {positionId && targetsQuery.isLoading ? <CenteredSpinner /> : null}

      {positionId && !targetsQuery.isLoading && targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No applications for this position yet.
        </p>
      ) : null}

      {targets.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Contract status</TableHead>
                <TableHead>Sent / Opened / Affirmed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => {
                const contract = target.contract;
                const blocked =
                  target.applicationStatus === "rejected" ||
                  contract?.status === "signed" ||
                  contract?.status === "declined";
                return (
                  <TableRow key={target.applicationId}>
                    <TableCell>
                      <div className="font-medium">{target.candidateName}</div>
                      <div className="text-xs text-muted-foreground">
                        {target.candidateEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getApplicationStatusLabel(target.applicationStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contract ? (
                        <Badge>
                          {getContractStatusLabel(contract.status)}
                          {contract.version > 1 ? ` · v${contract.version}` : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not sent yet
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {contract
                        ? `${formatDate(contract.sentAt)} / ${formatDate(
                            contract.openedAt,
                          )} / ${formatDate(contract.receiptAffirmedAt)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={contract ? "outline" : "default"}
                        disabled={blocked}
                        onClick={() => setSendTarget(target)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {contract ? "Resend / revise" : "Send for review"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {sendTarget ? (
        <SendContractDialog
          target={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={handleSent}
        />
      ) : null}
    </div>
  );
}

function SendContractDialog({
  target,
  onClose,
  onSent,
}: {
  target: SendTarget;
  onClose: () => void;
  onSent: () => void;
}) {
  const templatesQuery = useQuery(contractTemplatesQueryOptions());
  const templates: ContractTemplateRow[] = templatesQuery.data ?? [];
  const [templateId, setTemplateId] = useState<string>("auto");
  const [compensation, setCompensation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const variables: Record<string, string> = {};
      if (compensation.trim()) variables.compensation = compensation.trim();
      if (startDate.trim()) variables.startDate = startDate.trim();
      if (location.trim()) variables.location = location.trim();

      const result = await sendContractForReview({
        data: {
          applicationId: target.applicationId,
          templateId: templateId === "auto" ? null : templateId,
          variables,
          subject: subject.trim() || null,
          customMessage: message.trim() || null,
          expiryDays: 14,
        },
      });

      if ("error" in result) {
        toast.error(result.error ?? "Failed to send the contract");
        return;
      }
      toast.success(
        `Contract sent to ${target.candidateName}${
          result.emailEnqueued ? " and emailed" : ""
        }.`,
      );
      onSent();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send the contract",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Send contract to {target.candidateName}
          </DialogTitle>
          <DialogDescription>
            The candidate&apos;s name and position are merged into the template
            automatically. Every placeholder token in the template must resolve
            before the contract can be sent — sending is blocked otherwise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contract template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto — position, then hire level
                </SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.positionName
                      ? ` (${template.positionName})`
                      : template.hireLevel
                        ? ` (${template.hireLevel})`
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="compensation">Compensation</Label>
              <Input
                id="compensation"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder="$150,000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="New York, NY"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contract-subject">Email subject</Label>
            <Input
              id="contract-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your contract for review — {positionName}"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contract-message">Email message (optional)</Label>
            <Textarea
              id="contract-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Short note before the review link…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || templatesQuery.isLoading}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- Templates

function TemplatesTab() {
  const invalidate = useQueryInvalidation();
  const templatesQuery = useQuery(contractTemplatesQueryOptions());
  const templates: ContractTemplateRow[] = templatesQuery.data ?? [];
  const [editing, setEditing] = useState<ContractTemplateRow | null>(null);

  const handleDelete = async (template: ContractTemplateRow) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await deleteContractTemplate({ data: template.id });
      toast.success("Template deleted");
      void invalidate.contracts();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  if (templatesQuery.isLoading) return <CenteredSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates can target a specific position or a hire level (used as the
          fallback when a position has no dedicated template). Use the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            /contracts/new
          </code>{" "}
          page to author one with the full editor and live preview.
        </p>
        <Button asChild>
          <Link to="/contracts/new">
            <Plus className="h-4 w-4" /> New template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No templates yet — create one so contracts can be sent. Until a
          template exists, sending is blocked (so nothing ever goes out
          half-merged).
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {template.positionName ?? "—"}
                  {template.hireLevel ? ` · ${template.hireLevel}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(template.updatedAt)}
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <TemplateEditorDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void invalidate.contracts();
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateEditorDialog({
  template,
  onClose,
  onSaved,
}: {
  template: ContractTemplateRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const positionsQuery = useQuery({
    queryKey: ["positions", "options"],
    queryFn: loadPositionOptions,
  });
  const positions: PositionOption[] = positionsQuery.data ?? [];
  const [name, setName] = useState(template.name);
  const [positionId, setPositionId] = useState<string>(
    template.positionId ?? "any",
  );
  const [hireLevel, setHireLevel] = useState<HireLevel | "none">(
    template.hireLevel ?? "none",
  );
  const [body, setBody] = useState(template.bodyTemplate);
  const [isActive, setIsActive] = useState(template.isActive);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and contract body are required");
      return;
    }
    setSaving(true);
    try {
      const payload: ContractTemplateUpdateInput = {
        id: template.id,
        name: name.trim(),
        positionId: positionId === "any" ? null : positionId,
        hireLevel: hireLevel === "none" ? null : hireLevel,
        bodyTemplate: body,
        isActive,
      };
      const result = await updateContractTemplate({ data: payload });

      if ("error" in result) {
        toast.error(result.error ?? "Failed to save template");
        return;
      }
      toast.success(`Template "${payload.name}" saved`);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template",
      );
    } finally {
      setSaving(false);
    }
  };

  const tokenChips = [
    ...Object.entries(CONTRACT_CORE_TOKENS).map(([token, label]) => ({
      token,
      label,
    })),
    { token: "compensation", label: "Compensation" },
    { token: "startDate", label: "Start date" },
    { token: "location", label: "Location" },
  ];

  const insertToken = (token: string) => {
    setBody((prev) => `${prev}\n\n{{${token}}}`);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit template</DialogTitle>
          <DialogDescription>
            Write the contract with placeholder tokens like candidateName and
            positionName. The candidate name, position, and your offer fields
            are substituted automatically when the contract is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Analyst Employment Agreement"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-position">Linked position (optional)</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger id="tpl-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any position (use hire level)</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-level">Hire level fallback (optional)</Label>
            <Select
              value={hireLevel}
              onValueChange={(value) => {
                // SAFETY: the SelectItems below are exactly the HireLevel
                // union plus the "none" sentinel.
                setHireLevel(value as HireLevel | "none");
              }}
            >
              <SelectTrigger id="tpl-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="managing-director">
                  Managing Director
                </SelectItem>
                <SelectItem value="vice-president">Vice President</SelectItem>
                <SelectItem value="associate">Associate</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Label htmlFor="tpl-active">Active</Label>
            <Switch
              id="tpl-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Merge tokens — click to insert</Label>
          <div className="flex flex-wrap gap-1.5">
            {tokenChips.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                title={label}
                onClick={() => insertToken(token)}
                className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted/70"
              >
                {`{{${token}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tpl-body">Contract body</Label>
          <Textarea
            id="tpl-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="font-mono text-xs leading-relaxed"
            placeholder={
              "EMPLOYMENT AGREEMENT\n\nThis agreement is made between {{candidateName}} …"
            }
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || positionsQuery.isLoading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
