import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@workspace/ui/components/sonner";
import { Suspense } from "react";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/sidebars/app-sidebar";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} ${fontSans.className} antialiased min-h-svh bg-background`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:shadow-md"
        >
          Skip to main content
        </a>
        <Providers>
          <SidebarProvider>
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>
            <main id="main-content" className="flex-1 min-w-0">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8 overflow-x-hidden">
                {children}
              </div>
            </main>
          </SidebarProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
