import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModeToggle } from "~/components/mode-toggle";

export const Route = createFileRoute("/_auth")({
  component: AuthRouteLayout,
});

function AuthRouteLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
