import { Link } from "@tanstack/react-router";
import { ShieldCheckIcon, SparklesIcon } from "lucide-react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid lg:grid-cols-2">
            <aside className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm/5 opacity-90">Dark Alpha Capital</p>
                  <p className="text-lg font-semibold tracking-tight">DAC HR</p>
                </div>
              </div>
              <div className="space-y-5">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                  Secure access to HR operations.
                </h1>
                <p className="text-sm/6 text-primary-foreground/90">
                  Sign in with your work account to manage hiring, onboarding,
                  and employee workflows.
                </p>
                <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
                  <SparklesIcon className="size-4" />
                  <span>SSO &bull; No passwords &bull; Fast setup</span>
                </div>
              </div>
              <div className="text-xs text-primary-foreground/80">
                <p className="mt-1">
                  <Link
                    to="/"
                    className="underline underline-offset-4 hover:opacity-90"
                  >
                    Back to app
                  </Link>
                </p>
              </div>
            </aside>
            <section className="flex flex-col justify-center p-6 sm:p-10">
              <div className="mx-auto w-full max-w-sm">
                <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-medium tracking-tight">DAC HR</p>
                    <p className="text-xs text-muted-foreground">
                      Dark Alpha Capital
                    </p>
                  </div>
                </div>
                {children}
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Protected by your organization&apos;s Google sign-in.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
