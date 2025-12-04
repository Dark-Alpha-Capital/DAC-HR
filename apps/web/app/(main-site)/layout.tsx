import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@workspace/ui/components/sonner";
import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/sidebars/app-sidebar";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased `}
      >
        <Providers>
          <SidebarProvider>
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>

            <main className="flex-1 p-4">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
