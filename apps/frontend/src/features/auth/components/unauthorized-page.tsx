import { Link, useSearch } from "@tanstack/react-router";

const ERROR_MESSAGES = {
  internal_server_error: {
    title: "Sign-in failed",
    body: "Something went wrong during sign-in. This is usually a temporary server issue — please try again. If it keeps happening, contact your administrator.",
  },
  access_denied: {
    title: "Access denied",
    body: "Google sign-in was cancelled or denied. Please try again and approve access when prompted.",
  },
} as const satisfies Record<string, { title: string; body: string }>;

export function UnauthorizedPage() {
  const { error } = useSearch({ from: "/_auth/unauthorized" });
  const knownError =
    error === "internal_server_error" || error === "access_denied"
      ? ERROR_MESSAGES[error]
      : undefined;

  if (knownError) {
    return (
      <>
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {knownError.title}
          </h1>
          <p className="text-sm text-muted-foreground">{knownError.body}</p>
        </div>

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Cannot sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          You cannot access DAC Recruiting because you used a non-Dark Alpha
          Capital email address. Please sign in with an account ending in
          @darkalphacapital.com.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        If you believe this is an error, please contact your administrator.
      </p>

      <p className="text-center text-sm">
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
