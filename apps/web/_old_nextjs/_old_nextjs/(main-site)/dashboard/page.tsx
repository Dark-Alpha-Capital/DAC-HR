import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  LayoutDashboard,
  Users,
  FileText,
  Folders,
  Building2,
  Briefcase,
  HelpCircle,
  CircleDot,
  Shield,
  ScrollText,
  Calendar,
  User,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

const siteLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "View dashboard overview",
  },
  {
    href: "/candidates",
    label: "Candidates",
    icon: Users,
    description: "Manage candidate profiles and applications",
  },
  {
    href: "/applications",
    label: "Applications",
    icon: FileText,
    description: "Track candidate applications and their status",
  },
  {
    href: "/documents",
    label: "Documents",
    icon: Folders,
    description: "Manage and view documents",
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Building2,
    description: "Manage employee records and departments",
  },
  {
    href: "/positions",
    label: "Positions",
    icon: Briefcase,
    description: "Create and manage job positions",
  },
  {
    href: "/questions",
    label: "Questions",
    icon: HelpCircle,
    description: "Manage interview questions",
  },
  {
    href: "/rounds",
    label: "Rounds",
    icon: CircleDot,
    description: "Configure interview rounds",
  },
  {
    href: "/interviews",
    label: "Interviews",
    icon: Calendar,
    description: "Schedule and manage interviews",
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    description: "Admin dashboard and management",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    description: "View system audit logs",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    description: "View and manage your profile",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Quick access to common areas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {siteLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={{ pathname: link.href }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{link.label}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {link.description}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
