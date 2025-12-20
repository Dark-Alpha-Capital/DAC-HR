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
import { Metadata } from "next";

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
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Available links and navigation
        </p>
      </div>

      {/* Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {siteLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={{ pathname: link.href }}>
              <Card className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{link.label}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {link.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
