import { ChevronDown } from "lucide-react";
import { authClient } from "#/features/auth/client";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "#/components/shared/theme-provider";
import type { AppSession } from "#/lib/auth-session";

export function UserNav({ session }: { session: AppSession | null }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const user = session?.user ?? null;

  const handleLogout = async () => {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="user-nav-button"
          variant="ghost"
          size="sm"
          className="max-w-56 gap-2 px-1.5"
        >
          {session && user ? (
            <>
              <img
                src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? "User Avatar"}
                width={28}
                height={28}
                className="size-7 rounded-full"
              />
              <span
                data-testid="user-email"
                className="hidden truncate text-sm sm:inline"
              >
                {user.email ?? user.name ?? "User"}
              </span>
            </>
          ) : (
            <>
              <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                <span className="text-xs text-muted-foreground">?</span>
              </div>
              <span
                data-testid="user-email"
                className="hidden truncate text-sm sm:inline"
              >
                Not signed in
              </span>
            </>
          )}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="user-nav-menu"
        side="bottom"
        align="end"
        className="min-w-48"
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
            <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
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
  );
}
