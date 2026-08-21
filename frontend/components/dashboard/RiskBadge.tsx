"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import type { Beneficiary } from "@/types";
import { getRiskTier, getRiskTierLabel } from "@/lib/utils";

interface RiskBadgeProps {
  tier: "low" | "medium" | "high" | "critical";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  low: { icon: CheckCircle, bg: "bg-[var(--risk-low)]/10", text: "text-[var(--risk-low)]", border: "border-[var(--risk-low)]/20" },
  medium: { icon: AlertCircle, bg: "bg-[var(--risk-medium)]/10", text: "text-[var(--risk-medium)]", border: "border-[var(--risk-medium)]/20" },
  high: { icon: AlertTriangle, bg: "bg-[var(--risk-high)]/10", text: "text-[var(--risk-high)]", border: "border-[var(--risk-high)]/20" },
  critical: { icon: XCircle, bg: "bg-[var(--risk-critical)]/10", text: "text-[var(--risk-critical)]", border: "border-[var(--risk-critical)]/20" },
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
};

export function RiskBadge({ tier, size = "md", showIcon = true, className }: RiskBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        SIZE_CLASSES[size],
        config.bg,
        config.text,
        config.border,
        "font-medium",
        className
      )}
    >
      {showIcon && <Icon className={cn("flex-shrink-0", size === "sm" && "w-3 h-3", size === "md" && "w-3.5 h-3.5", size === "lg" && "w-4 h-4")} />}
      {getRiskTierLabel(tier)}
    </Badge>
  );
}

interface RiskScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function RiskScore({ score, size = "md", showBar = true, showLabel = true, className }: RiskScoreProps) {
  const tier = getRiskTier(score);
  const config = TIER_CONFIG[tier];

  const sizeStyles = {
    sm: { fontSize: "text-lg", barHeight: "h-1.5", barWidth: "w-24" },
    md: { fontSize: "text-2xl", barHeight: "h-2", barWidth: "w-32" },
    lg: { fontSize: "text-3xl", barHeight: "h-2.5", barWidth: "w-40" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      {showLabel && (
        <div className="flex items-baseline gap-2">
          <span className={cn(styles.fontSize, "font-bold tabular-nums", config.text)}>{score.toFixed(2)}</span>
          <RiskBadge tier={tier} size={size} />
        </div>
      )}
      {showBar && (
        <div className={cn(styles.barWidth, styles.barHeight, "bg-muted rounded-full overflow-hidden")}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(score * 100, 100)}%`,
              backgroundColor: `var(--risk-${tier})`,
            }}
          />
        </div>
      )}
    </div>
  );
}

interface BeneficiaryRiskBadgeProps {
  beneficiary: Beneficiary;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BeneficiaryRiskBadge({ beneficiary, size = "md", className }: BeneficiaryRiskBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <RiskScore score={beneficiary.riskScore} size={size} showLabel={true} showBar={size !== "sm"} />
      <RiskBadge tier={beneficiary.riskTier} size={size} showIcon={true} />
    </div>
  );
}