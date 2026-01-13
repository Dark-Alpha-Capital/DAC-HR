import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import Link from "next/link";
import { ShieldCheckIcon, SparklesIcon } from "lucide-react";

const fontGeist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontGeist.variable} ${fontGeistMono.variable} font-geist antialiased min-h-screen bg-background`}
      >
        <Providers>
          <main className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(900px_circle_at_80%_30%,hsl(var(--accent)/0.12),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px]" />

            <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
              <div className="w-full overflow-hidden rounded-2xl border bg-card/70 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <div className="grid lg:grid-cols-2">
                  <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50 p-10 text-primary-foreground lg:flex">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
                        <ShieldCheckIcon className="size-5" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm/5 opacity-90">
                          Dark Alpha Capital
                        </p>
                        <p className="text-lg font-semibold tracking-tight">
                          DAC HR
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                        Secure access to HR operations.
                      </h1>
                      <p className="text-sm/6 text-primary-foreground/90">
                        Sign in with your work account to manage hiring,
                        onboarding, and employee workflows.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
                        <SparklesIcon className="size-4" />
                        <span>SSO • No passwords • Fast setup</span>
                      </div>
                    </div>

                    <div className="text-xs text-primary-foreground/80">
                      <p className="mt-1">
                        <Link
                          href="/"
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
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border">
                          <ShieldCheckIcon className="size-5" />
                        </div>
                        <div className="leading-tight">
                          <p className="text-sm font-medium tracking-tight">
                            DAC HR
                          </p>
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
        </Providers>
      </body>
    </html>
  );
}
