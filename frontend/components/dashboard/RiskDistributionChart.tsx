"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "@/components/ui/chart";
import type { RiskDistribution } from "@/types";

interface RiskDistributionChartProps {
  data: RiskDistribution;
  className?: string;
}

const CHART_CONFIG: ChartConfig = {
  low: { label: "Low", color: "var(--risk-low)" },
  medium: { label: "Medium", color: "var(--risk-medium)" },
  high: { label: "High", color: "var(--risk-high)" },
  critical: { label: "Critical", color: "var(--risk-critical)" },
};

export function RiskDistributionChart({ data, className }: RiskDistributionChartProps) {
  const total = data.total;
  const chartData = [
    { name: "Low", value: data.low, fill: "var(--risk-low)" },
    { name: "Medium", value: data.medium, fill: "var(--risk-medium)" },
    { name: "High", value: data.high, fill: "var(--risk-high)" },
    { name: "Critical", value: data.critical, fill: "var(--risk-critical)" },
  ];

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Risk Distribution</CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[var(--risk-critical)]" />
            <span>12 moved to high-risk in 24h</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="text-center p-3 rounded-lg bg-[var(--risk-low)]/10">
            <p className="text-2xl font-bold text-[var(--risk-low)]">{data.low.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Low ({((data.low / total) * 100).toFixed(1)}%)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--risk-medium)]/10">
            <p className="text-2xl font-bold text-[var(--risk-medium)]">{data.medium.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Medium ({((data.medium / total) * 100).toFixed(1)}%)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--risk-high)]/10">
            <p className="text-2xl font-bold text-[var(--risk-high)]">{data.high.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">High ({((data.high / total) * 100).toFixed(1)}%)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--risk-critical)]/10">
            <p className="text-2xl font-bold text-[var(--risk-critical)]">{data.critical.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Critical ({((data.critical / total) * 100).toFixed(1)}%)</p>
          </div>
        </div>

        <div className="mt-6 relative h-48 md:h-56">
          <ChartContainer config={CHART_CONFIG} className="h-full aspect-auto">
            <PieChart>
              <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
              <Legend content={<ChartLegendContent className="flex flex-col gap-2 md:flex-row md:justify-center" />} />
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
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>12 beneficiaries</strong> moved into high-risk status over the last 24 hours.
            <span className="ml-2 text-primary font-medium">Review recommended actions.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
