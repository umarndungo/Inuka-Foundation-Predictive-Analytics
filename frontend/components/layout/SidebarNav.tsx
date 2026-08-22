"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  AlertTriangle,
  Map,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, group: "Analytics" },
  { name: "Demand Forecasts", href: "/forecasts", icon: TrendingUp, group: "Analytics", badge: "Live" },
  { name: "Risk Radar", href: "/risk", icon: ShieldAlert, group: "Analytics" },
  { name: "Beneficiaries", href: "/beneficiaries", icon: Users, group: "Field Operations" },
  { name: "Early Warning Alerts", href: "/alerts", icon: AlertTriangle, group: "Field Operations" },
  { name: "Geospatial Map", href: "/map", icon: Map, group: "Field Operations" },
] as const;

const groupLabels = ["Analytics", "Field Operations"];

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  showFooter?: boolean;
  activeAlertsCount?: number;
}

export function SidebarNav({ collapsed = false, onNavigate, showFooter = true, activeAlertsCount = 0 }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {groupLabels.map((group) => {
          const items = navigation.filter((n) => n.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="space-y-1">
              {!collapsed && (
                <h3 className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  {group}
                </h3>
              )}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const badgeLabel = item.href === "/alerts"
                  ? (activeAlertsCount > 0 ? String(activeAlertsCount) : null)
                  : ("badge" in item ? item.badge : null);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors group",
                      isActive
                        ? "bg-secondary text-foreground font-semibold border border-border"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          isActive ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                        )}
                        aria-hidden="true"
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!collapsed && badgeLabel && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground border border-border"
                        )}
                      >
                        {badgeLabel}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {showFooter && !collapsed && (
        <div className="border-t border-border p-3 bg-secondary/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px]">Predictive ML v1.0</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              Synced
            </span>
          </div>
        </div>
      )}
    </>
  );
}
