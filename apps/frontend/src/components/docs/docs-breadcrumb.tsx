import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { docsNavItems } from "./docs-nav";

export function DocsBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const getBreadcrumbs = () => {
    const breadcrumbs: { title: string; href: string }[] = [
      { title: "Home", href: "/" },
      { title: "Docs", href: "/docs" },
    ];

    if (pathname === "/docs") {
      return breadcrumbs;
    }

    // Find the current page in the nav items
    for (const item of docsNavItems) {
      if (item.href === pathname) {
        breadcrumbs.push({ title: item.title, href: item.href });
        break;
      }
      if (item.items) {
        for (const subItem of item.items) {
          if (subItem.href === pathname) {
            breadcrumbs.push({ title: item.title, href: item.href });
            breadcrumbs.push({ title: subItem.title, href: subItem.href });
            break;
          }
        }
      }
    }

    // Handle workflow sub-pages
    if (pathname.startsWith("/docs/workflows/")) {
      const workflowItem = docsNavItems.find((item) =>
        item.href.startsWith("/docs/workflows"),
      );
      if (workflowItem) {
        if (!breadcrumbs.some((b) => b.href === "/docs/workflows")) {
          breadcrumbs.push({ title: "Workflows", href: "/docs/workflows" });
        }
        const subItem = workflowItem.items?.find(
          (sub) => sub.href === pathname,
        );
        if (subItem && !breadcrumbs.some((b) => b.href === subItem.href)) {
          breadcrumbs.push({ title: subItem.title, href: subItem.href });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {index === 0 ? (
            <Link
              to={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
            </Link>
          ) : index === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.title}</span>
          ) : (
            <Link
              to={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
