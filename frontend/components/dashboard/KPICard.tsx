"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Users,
  AlertTriangle,
  Bell,
  Wifi,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
  Target,
  Sparkles,
} from "lucide-react";
import type { KPIMetric } from "@/types";

interface KPICardProps {
  metric: KPIMetric;
  className?: string;
}

const lucideIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  "alert-triangle": AlertTriangle,
  bell: Bell,
  wifi: Wifi,
  "message-square": MessageSquare,
  "trending-up": TrendingUp,
  "shield-alert": ShieldAlert,
  target: Target,
  sparkles: Sparkles,
};

export function KPICard({ metric, className }: KPICardProps) {
  const Icon = lucideIconMap[metric.icon] || Users;

  return (
    <Card className={cn("rounded-md p-5 bg-card hover:bg-secondary/40 transition-colors space-y-4 shadow-none border-none", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          {metric.label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary text-foreground shrink-0 border border-border/40">
          <Icon className="w-4 h-4 text-foreground/80" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-3xl font-extrabold tracking-tight text-foreground font-sans tabular-nums">
            {metric.value}
          </span>
        </div>

        {metric.description && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="truncate text-xs font-sans text-muted-foreground">{metric.description}</span>
          </div>
        )}
      </div>
    </Card>
  );
}