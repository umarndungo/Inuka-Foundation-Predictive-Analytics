"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Beneficiary } from "@/types";
import { getRiskTier, getRiskTierLabel } from "@/lib/utils";

interface RiskBadgeProps {
  tier: "low" | "medium" | "high" | "critical";
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({ tier, size = "md", className }: RiskBadgeProps) {
  const isUrgent = tier === "high" || tier === "critical";

  return (
    <StatusBadge
      status={tier}
      label={`${getRiskTierLabel(tier)} RISK`}
      size={size}
      showDot={isUrgent}
      className={className}
    />
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
  const isUrgent = tier === "high" || tier === "critical";

  const sizeStyles = {
    sm: { fontSize: "text-lg", barHeight: "h-1.5", barWidth: "w-24" },
    md: { fontSize: "text-2xl", barHeight: "h-2", barWidth: "w-32" },
    lg: { fontSize: "text-3xl", barHeight: "h-2.5", barWidth: "w-40" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      {showLabel && (
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              styles.fontSize,
              "font-bold tabular-nums font-mono",
              isUrgent ? "text-red-600 dark:text-red-400" : "text-foreground"
            )}
          >
            {score.toFixed(2)}
          </span>
          <RiskBadge tier={tier} size={size === "lg" ? "md" : "sm"} />
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
      <RiskBadge tier={beneficiary.riskTier} size={size === "lg" ? "md" : "sm"} />
    </div>
  );
}