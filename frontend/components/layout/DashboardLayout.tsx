"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { SidebarNav } from "./SidebarNav";
import { Header } from "./Header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { mockSystemStatus } from "@/lib/mock/data";
import { Shield } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { theme, setSystemStatus } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const applyTheme = (value: typeof theme) => {
      if (value === "system") {
        document.documentElement.classList.toggle(
          "dark",
          window.matchMedia("(prefers-color-scheme: dark)").matches
        );
      } else {
        document.documentElement.classList.toggle("dark", value === "dark");
      }
    };

    applyTheme(theme);

    setSystemStatus({
      ...mockSystemStatus,
      lastSync: new Date().toISOString(),
    });
  }, [theme, setSystemStatus]);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center animate-pulse" />
            <span className="font-heading font-medium text-lg">Inuka Sentinel</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 gap-0">
          <div className="flex h-16 items-center px-4 border-b">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold text-lg">Inuka Sentinel</span>
            </Link>
          </div>
          <div className="flex flex-col h-[calc(100%-4rem)]">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen((open) => !open)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
