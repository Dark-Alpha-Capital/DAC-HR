import type { Metadata } from "next";
import Link from "next/link";

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
import { ShieldXIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Denied - DAC-HR",
  description:
    "You cannot access this site with a non-Dark Alpha Capital email.",
};

export default function UnauthorizedPage() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <CardHeader className="text-center">
        <CardAction>
          <Badge variant="destructive" className="gap-1">
            <ShieldXIcon className="size-3.5" />
            Access Denied
          </Badge>
        </CardAction>
        <CardTitle className="text-2xl tracking-tight">
          Cannot sign in
        </CardTitle>
        <CardDescription>
          You cannot access this site because you are using a non-Dark Alpha
          Capital email address. Please sign in with an email ending in
          @darkalphacapital.com.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline font-medium"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
