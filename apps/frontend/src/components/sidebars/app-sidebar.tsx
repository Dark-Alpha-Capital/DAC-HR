import {
  LayoutDashboard,
  Users,
  Briefcase,
  Folders,
  CircleDot,
  Shield,
  Building2,
  ScrollText,
  BookOpen,
  ShieldCheckIcon,
  ScanSearch,
  CalendarCheck,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { AppSession } from "~/lib/auth-session";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";

import { SidebarUserNav } from "../sidebar-user-nav";

// Recruiting links (available to all users)
const recruitingLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/documents", label: "Documents", icon: Folders },
  { href: "/docs", label: "Documentation", icon: BookOpen },
] as const;

const peopleOpsLinks = [
  { href: "/employees", label: "Employees", icon: Building2 },
  { href: "/employees/attendance", label: "Attendance", icon: CalendarCheck },
] as const;

const configurationLinks = [
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/rounds", label: "Rounds", icon: CircleDot },
  { href: "/screeners", label: "Screeners", icon: ScanSearch },
] as const;

const adminLinks = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
] as const;

export function AppSidebar({ session }: { session: AppSession }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = session?.user?.role === "admin";

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="DAC HR">
              <Link to="/dashboard">
                <ShieldCheckIcon />
                <span className="font-semibold tracking-tight">DAC HR</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recruiting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recruitingLinks.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.href)}
                    tooltip={link.label}
                  >
                    <Link to={link.href}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationLinks.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.href)}
                    tooltip={link.label}
                  >
                    <Link to={link.href}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>People Ops</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {peopleOpsLinks.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(link.href)}
                      tooltip={link.label}
                    >
                      <Link to={link.href} search={{} as never}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminLinks.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(link.href)}
                      tooltip={link.label}
                    >
                      <Link to={link.href} search={{} as never}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserNav session={session} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
