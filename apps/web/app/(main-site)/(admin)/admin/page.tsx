import React, { Suspense } from "react";
import { UserIsAdmin } from "@/components/auth-checks";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Briefcase, HelpCircle, CircleDot, ArrowRight } from "lucide-react";
import { Metadata } from "next";
import { AdminUsersSection } from "./admin-users-section";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin dashboard and management",
};

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage positions, questions, and interview rounds for your
          organization
        </p>
      </div>

      <div className="border-t pt-8 mt-4">
        <AdminUsersSection />
      </div>

      <AdminContent />
    </div>
  );
};

export default page;

async function AdminContent() {
  const adminLinks: Array<{
    href: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      href: "/positions",
      title: "Positions",
      description:
        "Manage job positions, create new openings, and track position details.",
      icon: Briefcase,
    },
    {
      href: "/questions",
      title: "Questions",
      description:
        "Create and manage interview questions for different rounds and positions.",
      icon: HelpCircle,
    },
    {
      href: "/rounds",
      title: "Rounds",
      description:
        "Configure interview rounds, set up round templates, and manage round details.",
      icon: CircleDot,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Admin Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.href}
              className="flex flex-col hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{link.title}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {link.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button asChild className="w-full" variant="default">
                  <Link
                    href={{
                      pathname: link.href,
                    }}
                  >
                    Visit {link.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
