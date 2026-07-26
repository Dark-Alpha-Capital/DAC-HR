import { ChevronUp } from "lucide-react";
import { authClient } from "~/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "~/components/theme-provider";
import type { AppSession } from "~/lib/auth-session";

export function SidebarUserNav({ session }: { session: AppSession | null }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const user = session?.user ?? null;

  const handleLogout = async () => {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="user-nav-button"
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {session && user ? (
                <>
                  <img
                    src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                    alt={user.email ?? "User Avatar"}
                    width={32}
                    height={32}
                    className="size-8 rounded-full"
                  />
                  <span data-testid="user-email" className="truncate">
                    {user.email ?? user.name ?? "User"}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <span className="text-xs text-muted-foreground">?</span>
                  </div>
                  <span data-testid="user-email" className="truncate">
                    Not signed in
                  </span>
                </>
              )}
              <ChevronUp className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            align="start"
            className="w-(--anchor-width) min-w-(--anchor-width)"
          >
            {session && user ? (
              <>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => {
                    if (user.id) {
                      router.navigate({
                        to: "/profile/$userId",
                        params: { userId: user.id },
                      });
                    }
                  }}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    setTheme(resolvedTheme === "light" ? "dark" : "light")
                  }
                >
                  Toggle Theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleLogout}
                >
                  Logout
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => router.navigate({ to: "/login" })}
              >
                Login to your account
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
