import { ChevronUp, LoaderIcon } from "lucide-react";
import { Image } from "@unpic/react";
import { authClient } from "@/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { useRouter } from "@tanstack/react-router";
import type { Route } from "next";
import { useTheme } from "next-themes";

export function SidebarUserNav() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.navigate({ to: "/" });
        },
      },
    });
  };

  // Loading state - session is being streamed
  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10 justify-between cursor-not-allowed">
            <div className="flex flex-row gap-2 items-center">
              <div className="size-6 bg-muted rounded-full animate-pulse" />
              <span className="bg-muted text-transparent rounded-md animate-pulse w-24">
                Loading...
              </span>
            </div>
            <div className="animate-spin text-muted-foreground">
              <LoaderIcon className="size-4" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Unauthenticated state - no session
  if (!session || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                data-testid="user-nav-button"
                className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10"
              >
                <div className="size-6 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
                <span data-testid="user-email" className="truncate">
                  Not signed in
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              data-testid="user-nav-menu"
              side="top"
              align="start"
              style={{ width: "var(--radix-popper-anchor-width)" }}
            >
              <DropdownMenuItem asChild data-testid="user-nav-item-auth">
                <button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    router.navigate({ to: "/login" });
                  }}
                >
                  Login to your account
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Authenticated state - session is present
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="user-nav-button"
              className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10"
            >
              <Image
                src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? "User Avatar"}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span data-testid="user-email" className="truncate">
                {user.email ?? user.name ?? "User"}
              </span>

              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            align="start"
            style={{ width: "var(--radix-popper-anchor-width)" }}
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                if (user.id) {
                  router.navigate({ to: `/profile/${user.id}` as Route });
                }
              }}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              Toggle Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
