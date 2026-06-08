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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { User, LogOut, Menu } from "lucide-react";

const managementLinks = [{ href: "/employees", label: "Employees" }] as const;

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
  { href: "/questions", label: "Questions" },
  { href: "/positions", label: "Positions" },
  { href: "/applications", label: "Applications" },
  { href: "/rounds", label: "Rounds" },
  { href: "/documents", label: "Documents" },
] as const;

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  const { data: session, isPending } = authClient.useSession();

  console.log(session);

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity"
        >
          dac-hr
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {session?.user?.role === "admin" && (
            <Link
              href={{
                pathname: "/admin",
              }}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Admin
            </Link>
          )}

          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              {/* Recruiting Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium">
                  Recruiting
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-48 p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      Recruiting
                    </div>
                    <div className="space-y-1">
                      {navLinks.map((link) => {
                        const isActive =
                          pathname === link.href ||
                          pathname.startsWith(`${link.href}/`);

                        return (
                          <NavigationMenuLink
                            key={link.href}
                            asChild
                            className={isActive ? "bg-accent/50" : ""}
                          >
                            <Link
                              href={link.href}
                              className={`w-full ${
                                isActive ? "font-semibold text-primary" : ""
                              }`}
                            >
                              {link.label}
                            </Link>
                          </NavigationMenuLink>
                        );
                      })}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Management Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium">
                  Management
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-48 p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      Management
                    </div>
                    <div className="space-y-1">
                      {managementLinks.map((link) => {
                        const isActive =
                          pathname === link.href ||
                          pathname.startsWith(`${link.href}/`);

                        return (
                          <NavigationMenuLink
                            key={link.href}
                            asChild
                            className={isActive ? "bg-accent/50" : ""}
                          >
                            <Link
                              href={link.href}
                              className={`w-full ${
                                isActive ? "font-semibold text-primary" : ""
                              }`}
                            >
                              {link.label}
                            </Link>
                          </NavigationMenuLink>
                        );
                      })}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* User dropdown or Login button */}
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
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" asChild>
                <Link href="/signup">Sign In</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {isPending ? (
            <Spinner className="size-5 animate-spin" />
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

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                {/* Recruiting Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-2">
                    Recruiting
                  </h3>
                  <div className="space-y-1">
                    {navLinks.map((link) => {
                      const isActive =
                        pathname === link.href ||
                        pathname.startsWith(`${link.href}/`);

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Management Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-2">
                    Management
                  </h3>
                  {managementLinks.map((link) => {
                    const isActive =
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);

                    return (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link
                          href={link.href}
                          className={`cursor-pointer ${isActive ? "text-primary font-semibold" : ""}`}
                        >
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                {/* User Profile Section (if logged in) */}
                {session?.user && (
                  <div className="mt-auto pt-4 border-t space-y-2">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">
                        {session.user.name || "User"}
                      </p>
                      {session.user.email && (
                        <p className="text-xs text-muted-foreground">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <User className="mr-2 size-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="mr-2 size-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
