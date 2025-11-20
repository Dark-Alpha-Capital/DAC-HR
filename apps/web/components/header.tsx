"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/auth-client";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Spinner } from "@workspace/ui/components/spinner";
import { User, LogOut } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
  { href: "/positions", label: "Positions" },
  { href: "/applications", label: "Applications" },
  { href: "/rounds", label: "Rounds" },
  { href: "/documents", label: "Documents" },
  { href: "/questions", label: "Questions" },
];

const Header = () => {
  const pathname = usePathname();

  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  const getUserInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0]?.toUpperCase() || "U";
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="text-xl font-bold hover:opacity-80 transition-opacity"
        >
          dac-hr
        </Link>
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={{
                  pathname: link.href,
                }}
                className={`text-sm font-medium transition-colors ${
                  isActive ? "text-primary font-semibold" : "hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isPending ? (
            <Spinner className="size-6 animate-spin" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
                  <Avatar className="size-8">
                    {session.user.image && (
                      <AvatarImage
                        src={session.user.image}
                        alt={session.user.name || "User"}
                      />
                    )}
                    <AvatarFallback>
                      {getUserInitials(session.user.name, session.user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name || "User"}
                    </p>
                    {session.user.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
      </div>
    </header>
  );
};

export default Header;
