"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/ui/status-badge";

interface RegionSummary {
  region: string;
  count: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

export function RegionCard({ region, count, highRisk, mediumRisk, lowRisk }: RegionSummary) {
  const pct = count > 0 ? ((highRisk / count) * 100).toFixed(1) : "0";

  return (
    <Popover>
      <PopoverTrigger className="cursor-pointer w-full text-left">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/40 text-xs hover:bg-secondary/80 transition-colors">
          <div>
            <p className="font-semibold text-foreground font-mono">{region}</p>
            <p className="text-muted-foreground font-mono text-[11px]">{count} beneficiaries</p>
          </div>
          <StatusBadge status={Number(pct) > 25 ? "high" : "low"} label={`${pct}% High Risk`} size="sm" />
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" sideOffset={8} className="w-64">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm font-mono">{region}</p>
            <p className="text-xs text-muted-foreground">{count} total beneficiaries</p>
          </div>
          <div className="space-y-2">
            <TierRow label="HIGH" count={highRisk} total={count} color="bg-red-500" />
            <TierRow label="MEDIUM" count={mediumRisk} total={count} color="bg-amber-500" />
            <TierRow label="LOW" count={lowRisk} total={count} color="bg-emerald-500" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TierRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {count} <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
