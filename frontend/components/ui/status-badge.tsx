"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StatusType =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "online"
  | "offline"
  | "synced"
  | "normal"
  | "warning"
  | "danger";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = "md",
  showDot = false,
  className,
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const isUrgent =
    normalizedStatus === "critical" ||
    normalizedStatus === "high" ||
    normalizedStatus === "danger" ||
    normalizedStatus === "offline";

  const colorStyles = isUrgent
    ? "bg-red-500/10 text-primary border-red-500/20 font-mono font-medium"
    : "bg-secondary text-foreground border-border font-mono font-medium";

  const dotColor = isUrgent ? "bg-primary" : "bg-zinc-500";

  const displayLabel =
    label ||
    (normalizedStatus === "online"
      ? "Operational"
      : normalizedStatus === "offline"
      ? "Offline"
      : status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize tracking-tight shrink-0 gap-1.5 rounded transition-colors font-sans border shadow-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        colorStyles,
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />}
      <span>{displayLabel}</span>
    </Badge>
  );
}
