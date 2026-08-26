"use client";

import { cn, maskPhone, formatRelativeTime, getRiskColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Beneficiary } from "@/types";

interface FeedRowProps {
  beneficiary: Beneficiary;
  selected?: boolean;
  onSelect: (b: Beneficiary) => void;
}

const tierDot: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-zinc-500",
  LOW: "bg-zinc-300",
};

export function FeedRow({ beneficiary: b, selected, onSelect }: FeedRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 border-b border-border/40 transition-colors cursor-pointer",
        selected
          ? "bg-accent/60 border-l-2 border-l-primary"
          : "bg-card hover:bg-secondary/50 border-l-2 border-l-transparent"
      )}
      onClick={() => onSelect(b)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(b); }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <span className={cn("block h-2.5 w-2.5 rounded-full", tierDot[b.riskTier])} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground font-mono truncate">
            {b.code}
          </span>
          <StatusBadge
            status={b.riskTier === "HIGH" ? "high" : b.riskTier === "MEDIUM" ? "medium" : "low"}
            label={b.riskTier}
            size="sm"
          />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {b.name} · {b.subCounty}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-mono">
          <span>{(b.riskScore * 100).toFixed(0)}%</span>
          <span className="text-border">|</span>
          <span>{b.region}</span>
          <span className="text-border">|</span>
          <span>{formatRelativeTime(b.lastActivity)}</span>
        </div>
      </div>
    </div>
  );
}
