import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Home, RotateCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { StatusScreen } from "#/components/shared/status-screen";
import { Button } from "#/components/ui/button";

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await router.invalidate();
    } finally {
      reset();
      setIsRetrying(false);
    }
  };

  return (
    <StatusScreen
      icon={TriangleAlert}
      iconClassName="bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-red-400"
    >
      <p className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
        Something went wrong
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        We hit an unexpected error
      </h1>

      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The page could not be loaded. Please try again. If the problem persists,
        contact your administrator.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <Button
          size="lg"
          className="px-5"
          onClick={handleRetry}
          disabled={isRetrying}
        >
          <RotateCw
            data-icon="inline-start"
            className={isRetrying ? "animate-spin" : undefined}
          />
          Try again
        </Button>
        <Button asChild variant="outline" size="lg" className="px-5">
          <Link to="/dashboard">
            <Home data-icon="inline-start" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      {import.meta.env.DEV && error ? (
        <details className="mt-8 w-full max-w-sm rounded-xl border border-border px-4 py-3 text-left">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Technical details
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {error instanceof Error ? error.stack : String(error)}
          </pre>
        </details>
      ) : null}
    </StatusScreen>
  );
}
