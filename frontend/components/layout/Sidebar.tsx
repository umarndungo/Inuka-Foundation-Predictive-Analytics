"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar as SidebarComponent } from "@/components/ui/sidebar";
import { SidebarNav } from "./SidebarNav";
import { useAppStore } from "@/lib/store";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";

export function Sidebar({ activeAlertsCount = 0 }: { activeAlertsCount?: number }) {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const collapsed = !sidebarOpen;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-shrink-0 h-full transition-all duration-200 border-r border-border bg-card shadow-none",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarComponent className="w-full flex flex-col h-full bg-card border-none">
        {/* Sidebar Header & Brand */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-bold text-sm tracking-tight text-foreground truncate">
                  Inuka Risk Radar
                </span>
                <span className="text-[9px] text-muted-foreground font-mono truncate uppercase tracking-wider">
                  Risk Intelligence
                </span>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground rounded", collapsed && "mx-auto")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation List */}
        <SidebarNav collapsed={collapsed} activeAlertsCount={activeAlertsCount} />
      </SidebarComponent>
    </aside>
  );
}
