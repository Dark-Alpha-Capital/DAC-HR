import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { StatusScreen } from "#/components/shared/status-screen";
import { Button } from "#/components/ui/button";

export function NotFoundPage() {
  return (
    <StatusScreen icon={SearchX}>
      <p className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
        Error 404
      </p>

      <h1 className="mt-3 text-5xl font-semibold tracking-tighter text-balance sm:text-6xl">
        Page not found
      </h1>

      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The page you were looking for doesn&apos;t exist or may have been moved.
        Double-check the address — or head back to somewhere you know works.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <Button asChild size="lg" className="px-5">
          <Link to="/dashboard">
            <Home data-icon="inline-start" />
            Back to dashboard
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="px-5"
          onClick={() => window.history.back()}
        >
          <ArrowLeft data-icon="inline-start" />
          Go back
        </Button>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        If you followed a link from an email and expected to see a page, it may
        no longer be available. Contact your administrator for help.
      </p>
    </StatusScreen>
  );
}
