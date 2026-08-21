"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar as SidebarComponent } from "@/components/ui/sidebar";
import { SidebarNav } from "./SidebarNav";
import { useAppStore } from "@/lib/store";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const collapsed = !sidebarOpen;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-shrink-0 h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarComponent className="w-full">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="relative w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold text-lg text-foreground truncate">
                Inuka Sentinel
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn("text-muted-foreground hover:text-foreground", collapsed && "mx-auto")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <SidebarNav collapsed={collapsed} />
      </SidebarComponent>
    </aside>
  );
}
