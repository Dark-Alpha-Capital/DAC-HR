import { ChevronUp } from "lucide-react";
import { authClient } from "@/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import type { AppSession } from "@/lib/auth-session";

export function SidebarUserNav({ session }: { session: AppSession }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = session?.user;

  const handleLogout = async () => {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="user-nav-button"
              className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10"
            >
              {session && user ? (
                <>
                  <img
                    src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                    alt={user.email ?? "User Avatar"}
                    width={24}
                    height={24}
                    className="size-6 rounded-full"
                  />
                  <span data-testid="user-email" className="truncate">
                    {user.email ?? user.name ?? "User"}
                  </span>
                </>
              ) : (
                <>
                  <div className="size-6 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">?</span>
                  </div>
                  <span data-testid="user-email" className="truncate">
                    Not signed in
                  </span>
                </>
              )}
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            align="start"
            style={{ width: "var(--radix-popper-anchor-width)" }}
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
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
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
