import { Suspense } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { LogInIcon, ShieldCheckIcon } from "lucide-react";
import { getSession } from "@/lib/middleware/auth-guard";
import GoogleSignInButton from "@/components/google-signin-button";
import { AuthLayout } from "@/components/auth-layout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login - DAC-HR" }],
  }),
  loader: async () => {
    const session = await getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout>
      <LoginContent />
    </AuthLayout>
  );
}

function LoginContent() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <CardHeader className="text-center">
        <CardAction>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheckIcon className="size-3.5" />
            SSO
          </Badge>
        </CardAction>
        <CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle>
        <CardDescription>
          Sign in with your work Google account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton callbackURL="/dashboard" />
        <div className="mt-6 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">No password</span>
          <Separator className="flex-1" />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          We don&apos;t store your password. Authentication is handled by
          Google.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function AuthLoadingSkeleton() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
          <LogInIcon className="size-5" />
        </div>
        <Skeleton className="mx-auto h-7 w-44" />
        <Skeleton className="mx-auto h-4 w-60" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-11 w-full" />
        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-px flex-1" />
        </div>
        <Skeleton className="mx-auto mt-4 h-4 w-72" />
      </CardContent>
      <CardFooter className="justify-center">
        <Skeleton className="h-4 w-56" />
      </CardFooter>
    </Card>
  );
}
