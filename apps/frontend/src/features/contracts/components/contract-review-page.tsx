import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";

type ContractReviewPayload = {
  token: string;
  status: string;
  version: number;
  candidateFirstName: string;
  positionName: string;
  bodyText: string;
  subject: string | null;
  customMessage: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  receiptAffirmedAt: string | null;
};

type ReviewState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; data: ContractReviewPayload }
  | { phase: "busy"; data: ContractReviewPayload };

export function ContractReviewPage({ token }: { token: string }) {
  const [state, setState] = useState<ReviewState>({ phase: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/contract/${token}`);
      // SAFETY: our API returns either { error } or the full review payload;
      // presence of bodyText (plus res.ok) is the runtime guard below.
      const body = (await res.json()) as {
        error?: string;
        bodyText?: string;
      };
      if (!res.ok || !body.bodyText) {
        throw new Error(body.error ?? "Contract not found");
      }
      // SAFETY: guarded above by res.ok and a non-empty bodyText from the same
      // server function that defines ContractReviewPayload.
      const payload = body as ContractReviewPayload;
      setState({ phase: "ready", data: payload });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const postAction = async (
    action: "affirm-receipt" | "negotiate" | "decline",
    successMessage: string,
  ) => {
    if (state.phase !== "ready" && state.phase !== "busy") return;
    const data = state.data;
    setError(null);
    setNotice(null);
    setState({ phase: "busy", data });
    try {
      const res = await fetch(`/api/contract/${token}/${action}`, {
        method: "POST",
      });
      // SAFETY: the server responds with { ok } or { error } only.
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Request failed");
      }
      setNotice(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setState({ phase: "ready", data });
    }
  };

  if (state.phase === "loading") {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>Loading your contract…</CardTitle>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (state.phase === "error") {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>Contract unavailable</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  const { data } = state;
  const busy = state.phase === "busy";

  const alreadyAffirmed = data.receiptAffirmedAt !== null;
  const awaitingReview = data.status === "sent_for_review";
  const inNegotiation = data.status === "negotiation";
  const declined = data.status === "declined";

  return (
    <Shell>
      {notice ? (
        <Alert>
          <AlertTitle>Received</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Contract for the {data.positionName} position
          </CardTitle>
          <CardDescription>
            Hi {data.candidateFirstName}, review the document below carefully.
            It has been prepared for you by the Dark Alpha Capital people team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-6 text-sm leading-relaxed whitespace-pre-wrap">
            {data.bodyText || "This contract is being prepared."}
          </div>

          {alreadyAffirmed ? (
            <Alert>
                <AlertTitle>Receipt confirmed</AlertTitle>
                <AlertDescription>
                  You confirmed on{" "}
                  {data.receiptAffirmedAt
                    ? new Date(data.receiptAffirmedAt).toLocaleDateString()
                    : ""}{" "}
                  that you received and reviewed this contract. The team will
                  be in touch about next steps.
                </AlertDescription>
            </Alert>
          ) : null}

          {declined ? (
            <Alert variant="destructive">
              <AlertTitle>Contract declined</AlertTitle>
              <AlertDescription>
                This contract has been declined. You can reach out to the team
                if anything changes.
              </AlertDescription>
            </Alert>
          ) : null}

          {!alreadyAffirmed && !declined ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please confirm that you have received this contract and read it
                through. This is not a signature — it simply lets the team know
                the document reached you.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || !awaitingReview}
                  onClick={() =>
                    postAction(
                      "affirm-receipt",
                      "Thank you — your receipt has been confirmed.",
                    )
                  }
                >
                  I affirm receipt of this contract
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    postAction(
                      "negotiate",
                      "Your request to discuss the terms has been sent. The team will reach out.",
                    )
                  }
                >
                  I have questions / want to discuss terms
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    postAction(
                      "decline",
                      "The contract has been declined. If this was a mistake, contact the team.",
                    )
                  }
                >
                  Decline this contract
                </Button>
              </div>
              {inNegotiation && !alreadyAffirmed ? (
                <p className="text-sm text-muted-foreground">
                  Negotiation requested — the team will contact you to discuss
                  terms.
                </p>
              ) : null}
              {!awaitingReview &&
              !alreadyAffirmed &&
              !inNegotiation &&
              !declined ? (
                <p className="text-sm text-muted-foreground">
                  This contract is no longer awaiting review
                  ({data.status.replace(/_/g, " ")}).
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <p className="text-lg font-semibold tracking-tight">
            DARK ALPHA CAPITAL
          </p>
          <p className="text-xs text-muted-foreground">Contract Review</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
