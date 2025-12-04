"use client";

import {
  ChevronDown,
  LayoutDashboard,
  Users,
  HelpCircle,
  Briefcase,
  FileText,
  Folders,
  CircleDot,
  Shield,
  Building2,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/auth-client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

import { Suspense } from "react";
import { SidebarUserNav } from "../sidebar-user-nav";

// Recruiting links (available to all users)
const recruitingLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/documents", label: "Documents", icon: Folders },
] as const;

// Management links (available to all users)
const managementLinks = [
  { href: "/employees", label: "Employees", icon: Building2 },
] as const;

// Admin links (only for admins)
const adminLinks = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/rounds", label: "Rounds", icon: CircleDot },
  { href: "/questions", label: "Questions", icon: HelpCircle },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  Select Workspace
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem>
                  <span>Acme Inc</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Acme Corp.</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <SidebarContent>
        {isAdmin && (
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
                      <Link href={link.href}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Recruiting Section */}
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
                    <Link href={link.href}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementLinks.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.href)}
                    tooltip={link.label}
                  >
                    <Link href={link.href}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Suspense>
          <SidebarUserNav />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
