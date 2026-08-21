"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
  Bell,
  Map,
  RefreshCw,
  Settings,
  Shield,
  Database,
} from "lucide-react";

export const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { name: "Risk Analysis", href: "/risk", icon: AlertTriangle, group: "Intelligence" },
  { name: "Beneficiaries", href: "/beneficiaries", icon: Users, group: "Intelligence" },
  { name: "Forecasts", href: "/forecasts", icon: TrendingUp, group: "Intelligence" },
  { name: "Live Telemetry", href: "/telemetry", icon: Activity, group: "Operations" },
  { name: "Alerts", href: "/alerts", icon: Bell, group: "Operations" },
  { name: "Field Map", href: "/map", icon: Map, group: "Operations" },
  { name: "Sync Status", href: "/sync", icon: RefreshCw, group: "System" },
  { name: "Settings", href: "/settings", icon: Settings, group: "System" },
] as const;

const groupLabels = ["Overview", "Intelligence", "Operations", "System"];

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  showFooter?: boolean;
}

export function SidebarNav({ collapsed = false, onNavigate, showFooter = true }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {groupLabels.map((group) => {
          const items = navigation.filter((n) => n.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
              )}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary text-primary-foreground shadow-sm",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {showFooter && !collapsed && (
        <div className="border-t p-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="w-4 h-4" />
              <span>v1.0.0-beta</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Inuka Foundation</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
