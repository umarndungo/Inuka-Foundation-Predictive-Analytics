"use client";

import { cn, maskPhone, getRiskColor, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Phone, MapPin, Calendar, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import type { Beneficiary } from "@/types";

interface BeneficiaryDetailPanelProps {
  beneficiary: Beneficiary;
  onClose: () => void;
  onFlyTo?: () => void;
  className?: string;
}

const trendIcon = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
} as const;

const trendLabel = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
} as const;

export function BeneficiaryDetailPanel({ beneficiary: b, onClose, onFlyTo, className }: BeneficiaryDetailPanelProps) {
  const Trend = trendIcon[b.trend];

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold font-mono text-white"
              style={{ backgroundColor: getRiskColor(b.riskTier) }}
            >
              {b.riskScore >= 0.75 ? (b.riskScore * 100).toFixed(0) : b.code.slice(-2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.code}</p>
              <p className="text-xs text-muted-foreground">{b.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge
              status={b.riskTier === "HIGH" ? "high" : b.riskTier === "MEDIUM" ? "medium" : "low"}
              label={`${b.riskTier} RISK`}
              showDot={b.riskTier === "HIGH"}
              size="sm"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Score bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xl font-bold text-foreground font-mono tracking-tight">
              {(b.riskScore * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">Dropout Probability</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${b.riskScore * 100}%`,
                backgroundColor: getRiskColor(b.riskTier),
              }}
            />
          </div>
        </div>

        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoPill icon={<MapPin className="h-3 w-3" />} label="Region" value={b.region} />
          <InfoPill icon={<MapPin className="h-3 w-3" />} label="Sub-County" value={b.subCounty} />
          <InfoPill icon={<Phone className="h-3 w-3" />} label="Phone" value={maskPhone(b.phoneNumber)} />
          <InfoPill icon={<Calendar className="h-3 w-3" />} label="Enrolled" value={new Date(b.enrollmentDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" })} />
          <InfoPill
            icon={<Trend className="h-3 w-3" />}
            label="Trend"
            value={trendLabel[b.trend]}
            valueClassName={b.trend === "declining" ? "text-red-600" : b.trend === "improving" ? "text-emerald-600" : ""}
          />
          <InfoPill icon={<span className="h-3 w-3 font-mono text-[9px] text-center">⏱</span>} label="Last Active" value={formatRelativeTime(b.lastActivity)} />
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Behavioral Metrics</p>
          <MetricBar label="Attendance Rate" value={b.attendanceRate} />
          <MetricBar label="Assignment Completion" value={b.assignmentCompletion} />
          <MetricBar label="Travel Distance" value={b.travelDistanceKm / 25} display={`${b.travelDistanceKm.toFixed(1)} km`} />
        </div>

        {/* Risk drivers */}
        {b.riskDrivers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Risk Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {b.riskDrivers.map((driver, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-mono bg-secondary/40 border-border/60 px-2 py-0.5">
                  {driver}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommended action */}
        <div className="p-3 rounded-md bg-secondary/40 border border-border/40">
          <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</p>
          <p className="text-xs text-foreground leading-relaxed">{b.recommendedAction}</p>
        </div>
      </div>

      {/* Footer actions */}
      {onFlyTo && (
        <div className="px-4 py-3 border-t border-border/60">
          <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={onFlyTo}>
            <ExternalLink className="h-3.5 w-3.5" />
            Focus on Map
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoPill({ icon, label, value, valueClassName }: { icon: React.ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="p-2 rounded bg-secondary/30 border border-border/30">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-xs font-semibold text-foreground font-mono", valueClassName)}>{value}</p>
    </div>
  );
}

function MetricBar({ label, value, display }: { label: string; value: number; display?: string }) {
  const pct = Math.min(Math.max(value * 100, 0), 100);
  const color =
    pct < 45 ? "bg-red-500" : pct < 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-mono">{label}</span>
        <span className="font-semibold text-foreground font-mono">{display ?? `${pct.toFixed(0)}%`}</span>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
