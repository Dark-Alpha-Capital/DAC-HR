import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import {
  BookOpen,
  Briefcase,
  Users,
  FileText,
  CircleDot,
  HelpCircle,
  Calendar,
  Folders,
  Building2,
  Sparkles,
  RefreshCcw,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
}

export const docsNavItems: NavItem[] = [
  {
    title: "Getting Started",
    href: "/docs",
    icon: BookOpen,
  },
  {
    title: "Feature Guides",
    href: "/docs/features",
    items: [
      {
        title: "Positions",
        href: "/docs/positions",
        icon: Briefcase,
      },
      {
        title: "Candidates",
        href: "/docs/candidates",
        icon: Users,
      },
      {
        title: "Applications",
        href: "/docs/applications",
        icon: FileText,
      },
      {
        title: "Interview Rounds",
        href: "/docs/rounds",
        icon: CircleDot,
      },
      {
        title: "Questions",
        href: "/docs/questions",
        icon: HelpCircle,
      },
      {
        title: "Interviews",
        href: "/docs/interviews",
        icon: Calendar,
      },
      {
        title: "Documents",
        href: "/docs/documents",
        icon: Folders,
      },
      {
        title: "Employees",
        href: "/docs/employees",
        icon: Building2,
      },
      {
        title: "AI Features",
        href: "/docs/ai-features",
        icon: Sparkles,
      },
      {
        title: "What's New",
        href: "/docs/whats-new",
        icon: RefreshCcw,
      },
    ],
  },
];

export function DocsNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (href: string) => {
    if (href === "/docs") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="space-y-1">
      {docsNavItems.map((item) => (
        <div key={item.href}>
          {item.items ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm font-semibold text-foreground">
                {item.title}
              </div>
              <div className="space-y-1">
                {item.items.map((subItem) => {
                  const Icon = subItem.icon;
                  return (
                    <Link
                      key={subItem.href}
                      to={subItem.href as any}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive(subItem.href)
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {subItem.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <Link
              to={item.href as any}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
