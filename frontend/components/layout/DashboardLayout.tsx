"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { SidebarNav } from "./SidebarNav";
import { Header } from "./Header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { setSystemStatus } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove("dark");

    let cancelled = false;

    const loadSystemStatus = async () => {
      try {
        const status = await api.getSystemStatus();
        if (!cancelled) {
          setSystemStatus(status);
        }
      } catch {
        // Leave system status unset on failure; downstream UI should treat null as unknown.
      }
    };

    loadSystemStatus();

    return () => {
      cancelled = true;
    };
  }, [setSystemStatus]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 gap-0 border-r border-border bg-card">
          <div className="flex h-14 items-center px-4 border-b border-border">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <SheetTitle className="font-heading font-bold text-sm tracking-tight text-foreground">
                Inuka Risk Radar
              </SheetTitle>
            </Link>
          </div>
          <div className="flex flex-col h-[calc(100%-3.5rem)] overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen((open) => !open)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
