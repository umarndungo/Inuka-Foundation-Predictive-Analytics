"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "@/components/ui/chart";
import type { RiskDistribution } from "@/types";
import { ShieldAlert } from "lucide-react";

interface RiskDistributionChartProps {
  data: RiskDistribution;
  className?: string;
}

const CHART_CONFIG: ChartConfig = {
  low: { label: "Low Tier", color: "var(--risk-low)" },
  medium: { label: "Medium Tier", color: "var(--risk-medium)" },
  high: { label: "High Tier", color: "var(--risk-high)" },
  critical: { label: "Critical Tier", color: "var(--risk-critical)" },
};

export function RiskDistributionChart({ data, className }: RiskDistributionChartProps) {
  const total = data.total || 1;
  const chartData = [
    { name: "Low", value: data.low, fill: "var(--risk-low)" },
    { name: "Medium", value: data.medium, fill: "var(--risk-medium)" },
    { name: "High", value: data.high, fill: "var(--risk-high)" },
    { name: "Critical", value: data.critical, fill: "var(--risk-critical)" },
  ];

  return (
    <Card className={cn("h-full flex flex-col border-none shadow-none rounded-md bg-card overflow-hidden", className)}>
      <CardHeader className="p-3.5 border-b border-border/40 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-mono uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Program Risk Tier Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Classification of enrolled beneficiaries across ML-calculated risk tiers.
            </CardDescription>
          </div>
          <StatusBadge status="high" label="+12 Flagged 24h" showDot size="sm" />
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5 flex-1">
        {/* Metric Sub-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded bg-secondary/60 border border-border/40 text-center space-y-0.5">
            <span className="text-base font-bold font-mono text-foreground">{data.low.toLocaleString()}</span>
            <span className="block text-[11px] text-muted-foreground font-mono">Low ({((data.low / total) * 100).toFixed(1)}%)</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/60 border border-border/40 text-center space-y-0.5">
            <span className="text-base font-bold font-mono text-foreground">{data.medium.toLocaleString()}</span>
            <span className="block text-[11px] text-muted-foreground font-mono">Medium ({((data.medium / total) * 100).toFixed(1)}%)</span>
          </div>
          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-center space-y-0.5">
            <span className="text-base font-bold font-mono text-primary">{data.high.toLocaleString()}</span>
            <span className="block text-[11px] font-mono font-medium text-primary">High ({((data.high / total) * 100).toFixed(1)}%)</span>
          </div>
          <div className="p-2.5 rounded bg-red-500/20 border border-red-500/30 text-center space-y-0.5">
            <span className="text-base font-bold font-mono text-red-600">{data.critical.toLocaleString()}</span>
            <span className="block text-[11px] font-mono font-bold text-red-600">Critical ({((data.critical / total) * 100).toFixed(1)}%)</span>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="relative h-48 min-h-[190px] flex items-center justify-center">
          <ChartContainer config={CHART_CONFIG} className="w-full h-full">
            <PieChart>
              <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-sans text-foreground">{total.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-mono font-semibold uppercase tracking-wider">Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
