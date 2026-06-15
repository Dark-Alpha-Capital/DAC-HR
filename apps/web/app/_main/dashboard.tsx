import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const Route = createFileRoute("/_main/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard" }],
  }),
  component: DashboardPage,
});

const siteLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "View dashboard overview",
  },
  {
    to: "/candidates",
    label: "Candidates",
    icon: Users,
    description: "Manage candidate profiles and applications",
  },
  {
    to: "/applications",
    label: "Applications",
    icon: FileText,
    description: "Track candidate applications and their status",
  },
  {
    to: "/documents",
    label: "Documents",
    icon: Folders,
    description: "Manage and view documents",
  },
  {
    to: "/employees",
    label: "Employees",
    icon: Building2,
    description: "Manage employee records and departments",
  },
  {
    to: "/positions",
    label: "Positions",
    icon: Briefcase,
    description: "Create and manage job positions",
  },
  {
    to: "/questions",
    label: "Questions",
    icon: HelpCircle,
    description: "Manage interview questions",
  },
  {
    to: "/rounds",
    label: "Rounds",
    icon: CircleDot,
    description: "Configure interview rounds",
  },
  {
    to: "/interviews",
    label: "Interviews",
    icon: Calendar,
    description: "Schedule and manage interviews",
  },
  {
    to: "/admin",
    label: "Admin",
    icon: Shield,
    description: "Admin dashboard and management",
  },
  {
    to: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    description: "View system audit logs",
  },
  {
    to: "/profile",
    label: "Profile",
    icon: User,
    description: "View and manage your profile",
  },
];

function DashboardPage() {
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
              <Link key={link.to} to={link.to}>
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
