import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Switch } from "#/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { loadPositionOptions } from "#/features/positions/server/queries/positions";
import { createContractTemplate } from "#/features/contracts/server/mutations/contracts";
import { CONTRACT_CORE_TOKENS, renderContractTemplate } from "#/features/contracts/helpers";
import { hireLevels, type HireLevel } from "#/lib/enums";

type PositionOption = { id: string; name: string };

const PREVIEW_SAMPLE_VALUES = {
  candidateName: "Jane Doe",
  candidateFirstName: "Jane",
  candidateLastName: "Doe",
  candidateEmail: "jane.doe@example.com",
  positionName: "Analyst",
  hireLevel: "analyst",
  department: "Deal Team",
  offerDate: "September 7, 2026",
  compensation: "$150,000",
  startDate: "October 1, 2026",
  location: "New York, NY",
};

export function NewContractTemplatePage() {
  const navigate = useNavigate();
  const positionsQuery = useQuery({
    queryKey: ["positions", "options"],
    queryFn: loadPositionOptions,
  });
  const positions: PositionOption[] = positionsQuery.data ?? [];

  const [name, setName] = useState("");
  const [positionId, setPositionId] = useState<string>("any");
  const [hireLevel, setHireLevel] = useState<HireLevel | "none">("none");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setBody((prev) => (prev.trim() ? `${prev}\n\n{{${token}}}` : `{{${token}}}`));
  };

  const unresolvedTokens = body ? body.match(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g) ?? [] : [];

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and contract body are required");
      return;
    }
    setSaving(true);
    try {
      await createContractTemplate({
        data: {
          name: name.trim(),
          positionId: positionId === "any" ? null : positionId,
          hireLevel: hireLevel === "none" ? null : hireLevel,
          bodyTemplate: body,
          isActive,
        },
      });
      toast.success(`Template "${name.trim()}" created`);
      void navigate({
        to: "/contracts",
        search: { tab: "templates" },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="secondary" size="sm">
          <Link to="/contracts" search={{ tab: "templates" }}>
            <ArrowLeft className="h-4 w-4" />
            Back to Contracts
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          New contract template
        </h1>
        <p className="text-sm text-muted-foreground">
          Write the full legal text with placeholder tokens. Values like the
          candidate name and position are merged in automatically when a
          contract is sent — every token must resolve or sending is blocked.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main editor column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 rounded-lg border p-5">
            <h2 className="text-sm font-semibold">Details</h2>
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
                    <SelectItem value="any">
                      Any position (use hire level)
                    </SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-level">
                  Hire level fallback (optional)
                </Label>
                <Select
                  value={hireLevel}
                  onValueChange={(value) => {
                    // SAFETY: the SelectItems are exactly the HireLevel
                    // union plus the "none" sentinel.
                    setHireLevel(value as HireLevel | "none");
                  }}
                >
                  <SelectTrigger id="tpl-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {hireLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Label htmlFor="tpl-active">Active</Label>
                <Switch
                  id="tpl-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-xs text-muted-foreground">
                  Inactive templates are never auto-selected.
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Contract body</h2>
              <span
                className={
                  unresolvedTokens.length > 0
                    ? "text-xs font-medium text-amber-600"
                    : "text-xs text-muted-foreground"
                }
              >
                {unresolvedTokens.length > 0
                  ? `${unresolvedTokens.length} token(s) will be filled at send time`
                  : "No placeholder tokens"}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Insert a token</Label>
              <div className="flex flex-wrap gap-1.5">
                {tokenChips.map(({ token, label }) => (
                  <button
                    key={token}
                    type="button"
                    title={label}
                    onClick={() => insertToken(token)}
                    className="rounded-md border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted/70"
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
                rows={24}
                className="min-h-[28rem] w-full font-mono text-xs leading-relaxed"
                placeholder={
                  "EMPLOYMENT AGREEMENT\n\nThis agreement is made on {{offerDate}} between Dark Alpha Capital and {{candidateName}} …"
                }
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/contracts" search={{ tab: "templates" }}>
                  Cancel
                </Link>
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || positionsQuery.isLoading}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Create template
              </Button>
            </div>
          </section>
        </div>

        {/* Help rail */}
        <aside className="space-y-4">
          <section className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <h2 className="text-sm font-semibold">How the merge works</h2>
            <p className="text-muted-foreground">
              Core tokens are filled automatically from the candidate and
              position records:
            </p>
            <ul className="space-y-1.5">
              {Object.entries(CONTRACT_CORE_TOKENS).map(([token, label]) => (
                <li
                  key={token}
                  className="flex items-center justify-between gap-2"
                >
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {`{{${token}}}`}
                  </code>
                  <span className="text-right text-xs text-muted-foreground">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Offer fields you define when sending — compensation, startDate,
              location — work the same way: put the token in the body, then
              fill it in the send dialog.
            </p>
          </section>

          <section className="space-y-2 rounded-lg border p-4 text-sm">
            <h2 className="text-sm font-semibold">Live preview</h2>
            <div className="rounded-md border bg-white p-4 whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {body.trim() ? (
                (() => {
                  try {
                    return renderContractTemplate(body, PREVIEW_SAMPLE_VALUES);
                  } catch (error) {
                    return (
                      <span className="text-amber-600">
                        {error instanceof Error
                          ? error.message
                          : "Preview unavailable"}
                      </span>
                    );
                  }
                })()
              ) : (
                <span className="text-muted-foreground">
                  Start typing above to see a preview with sample values.
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview uses sample values (candidateName = Jane Doe). Unknown
              tokens are listed so you notice them before sending.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
