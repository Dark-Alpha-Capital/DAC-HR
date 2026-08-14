import { Link } from "@tanstack/react-router";

export function UnauthorizedPage() {
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
