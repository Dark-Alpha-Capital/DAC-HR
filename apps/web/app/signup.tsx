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
import { ShieldCheckIcon, UserPlusIcon } from "lucide-react";
import { fetchSession } from "@/lib/auth-session";
import GoogleSignInButton from "@/components/google-signin-button";
import { AuthLayout } from "@/components/auth-layout";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Sign up - DAC-HR" }],
  }),
  loader: async () => {
    const session = await fetchSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthLoadingSkeleton />}>
        <SignupContent />
      </Suspense>
    </AuthLayout>
  );
}

function SignupContent() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <CardHeader className="text-center">
        <CardAction>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheckIcon className="size-3.5" />
            SSO
          </Badge>
        </CardAction>
        <CardTitle className="text-2xl tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          Use your work Google account to set up access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton callbackURL="/dashboard" />
        <div className="mt-6 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">One step</span>
          <Separator className="flex-1" />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your account is created automatically after successful Google sign-in.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
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
          <UserPlusIcon className="size-5" />
        </div>
        <Skeleton className="mx-auto h-7 w-52" />
        <Skeleton className="mx-auto h-4 w-56" />
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
        <Skeleton className="h-4 w-52" />
      </CardFooter>
    </Card>
  );
}
