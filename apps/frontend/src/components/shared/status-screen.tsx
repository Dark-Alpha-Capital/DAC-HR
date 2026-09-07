import type { LucideIcon } from "lucide-react";
import { ModeToggle } from "#/components/shared/mode-toggle";
import { cn } from "#/lib/utils";

type StatusScreenProps = {
  icon: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
};

export function StatusScreen({
  icon: Icon,
  iconClassName,
  children,
}: StatusScreenProps) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div
          className={cn(
            "mb-6 flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground [&_svg]:size-6",
            iconClassName,
          )}
        >
          <Icon aria-hidden="true" strokeWidth={1.75} />
        </div>
        {children}
      </div>
    </div>
  );
}
