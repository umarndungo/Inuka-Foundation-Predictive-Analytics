"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIMetric } from "@/types";

interface KPICardProps {
  metric: KPIMetric;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  "alert-triangle": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  bell: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  wifi: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  "message-square": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  "trending-up": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

export function KPICard({ metric, className }: KPICardProps) {
  const Icon = iconMap[metric.icon] || iconMap.users;
  const isPositive = metric.change >= 0;
  const statusColors = {
    normal: "text-muted-foreground",
    warning: "text-warning",
    critical: "text-destructive",
    positive: "text-success",
  };

  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-small font-medium text-muted-foreground">{metric.label}</CardTitle>
              <p className="text-caption text-muted-foreground/70">{metric.description}</p>
            </div>
          </div>
          {metric.status && (
            <span className={cn("text-caption font-medium px-2 py-0.5 rounded-full", statusColors[metric.status])}>
              {metric.status}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-h2 font-semibold text-foreground tabular-nums">{metric.value}</span>
          <div className={cn("flex items-center gap-1 text-small font-medium", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : metric.change !== 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
            <span className={cn(isPositive ? "text-success" : metric.change !== 0 ? "text-destructive" : "text-muted-foreground")}>
              {isPositive ? "+" : ""}{metric.change.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="mt-1 text-caption text-muted-foreground">{metric.changeLabel}</p>
      </CardContent>
    </Card>
  );
}