"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  AlertTriangle,
  Bell,
  Wifi,
  MessageSquare,
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

  // If metric is inverse (e.g. High Risk count), an increase is BAD (destructive) and triggers Red accent.
  const isUrgent = metric.isInverse ? metric.change > 0 : metric.change < 0;

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

          <div
            className={cn(
              "flex items-center gap-1 text-xs font-mono font-medium px-2.5 py-0.5 rounded shrink-0 border",
              isUrgent
                ? "bg-red-500/10 text-primary border-red-500/20"
                : "bg-secondary text-foreground border-border/60"
            )}
          >
            {metric.change > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : metric.change < 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            <span>
              {metric.change > 0 ? "+" : ""}
              {metric.change.toFixed(1)}%
            </span>
          </div>
        </div>

        {metric.description && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="truncate text-xs font-sans text-muted-foreground">{metric.description}</span>
            {metric.status && <StatusBadge status={metric.status} size="sm" />}
          </div>
        )}
      </div>
    </Card>
  );
}