import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Folders,
  Shield,
  Building2,
  ScrollText,
  BookOpen,
  ShieldCheckIcon,
  ScanSearch,
  CalendarCheck,
  Video,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { z } from "zod";
import type { AppSession } from "#/lib/auth-session";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#/components/ui/sidebar";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  withEmptySearch?: boolean;
};

type NavSectionId =
  | "recruiting"
  | "configuration"
  | "tutorial"
  | "people-ops"
  | "admin";

const OPEN_SECTIONS_STORAGE_KEY = "hr-sidebar-open-sections";

const openSectionsSchema = z.object({
  recruiting: z.boolean().optional(),
  configuration: z.boolean().optional(),
  tutorial: z.boolean().optional(),
  "people-ops": z.boolean().optional(),
  admin: z.boolean().optional(),
});

const recruitingLinks: readonly NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/documents", label: "Documents", icon: Folders },
];

const tutorialLinks: readonly NavLink[] = [
  { href: "/docs", label: "Tutorial", icon: BookOpen },
];

const peopleOpsLinks: readonly NavLink[] = [
  {
    href: "/employees",
    label: "Employees",
    icon: Building2,
    withEmptySearch: true,
  },
  {
    href: "/employees/attendance",
    label: "Meetings",
    icon: Video,
    withEmptySearch: true,
  },
  {
    href: "/employees/attendance/meeting-attendance",
    label: "Meeting Attendance",
    icon: CalendarCheck,
    withEmptySearch: true,
  },
];

const configurationLinks: readonly NavLink[] = [
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/screeners", label: "Screeners", icon: ScanSearch },
];

const adminLinks: readonly NavLink[] = [
  ...peopleOpsLinks,
  { href: "/admin", label: "Admin", icon: Shield, withEmptySearch: true },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    withEmptySearch: true,
  },
];

function readOpenSections(): Partial<Record<NavSectionId, boolean>> {
  try {
    const raw = sessionStorage.getItem(OPEN_SECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = openSectionsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {};
    return parsed.data;
  } catch {
    return {};
  }
}

function writeOpenSections(sections: Partial<Record<NavSectionId, boolean>>) {
  try {
    sessionStorage.setItem(OPEN_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function NavGroup({
  id,
  label,
  links,
  isActive,
  open,
  onOpenChange,
}: {
  id: NavSectionId;
  label: string;
  links: readonly NavLink[];
  isActive: (href: string) => boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/collapsible"
      data-section={id}
    >
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="w-full">
            {label}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.href)}
                    tooltip={link.label}
                  >
                    {link.withEmptySearch ? (
                      <Link to={link.href} search={{}}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    ) : (
                      <Link to={link.href}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar({ session }: { session: AppSession }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpen, isMobile } = useSidebar();
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = session?.user?.role === "admin";
  const [openSections, setOpenSections] = useState<
    Partial<Record<NavSectionId, boolean>>
  >({});

  useEffect(() => {
    setOpenSections(readOpenSections());
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const setSectionOpen = (id: NavSectionId, open: boolean) => {
    setOpenSections((current) => {
      const next = { ...current, [id]: open };
      writeOpenSections(next);
      return next;
    });
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="z-50"
      onMouseEnter={() => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        if (!isMobile) setOpen(true);
      }}
      onMouseLeave={() => {
        if (isMobile) return;
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = setTimeout(() => setOpen(false), 300);
      }}
    >
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
        <NavGroup
          id="recruiting"
          label="Recruiting"
          links={recruitingLinks}
          isActive={isActive}
          open={openSections.recruiting ?? false}
          onOpenChange={(open) => setSectionOpen("recruiting", open)}
        />
        <NavGroup
          id="configuration"
          label="Configuration"
          links={configurationLinks}
          isActive={isActive}
          open={openSections.configuration ?? false}
          onOpenChange={(open) => setSectionOpen("configuration", open)}
        />
        <NavGroup
          id="tutorial"
          label="Tutorial"
          links={tutorialLinks}
          isActive={isActive}
          open={openSections.tutorial ?? false}
          onOpenChange={(open) => setSectionOpen("tutorial", open)}
        />
        {isAdmin ? (
          <NavGroup
            id="admin"
            label="Admin"
            links={adminLinks}
            isActive={isActive}
            open={openSections.admin ?? false}
            onOpenChange={(open) => setSectionOpen("admin", open)}
          />
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
