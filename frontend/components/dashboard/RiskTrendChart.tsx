"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "@/components/ui/chart";
import type { RiskTrendPoint } from "@/types";
import { Button } from "@/components/ui/button";

interface RiskTrendChartProps {
  data: RiskTrendPoint[];
  className?: string;
}

const RANGE_CONFIG = {
  "24h": { label: "24h", days: 1, interval: "hour" },
  "7d": { label: "7d", days: 7, interval: "day" },
  "30d": { label: "30d", days: 30, interval: "day" },
} as const;

type RangeKey = keyof typeof RANGE_CONFIG;

const CHART_CONFIG: ChartConfig = {
  overall: { label: "Overall Risk", color: "var(--primary)" },
  highRisk: { label: "High Risk", color: "var(--risk-high)" },
  critical: { label: "Critical", color: "var(--risk-critical)" },
};

export function RiskTrendChart({ data, className }: RiskTrendChartProps) {
  const [range, setRange] = useState<RangeKey>("7d");

  const filteredData = data.slice(-RANGE_CONFIG[range].days);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Risk Trend</CardTitle>
          <div className="flex gap-1 bg-muted p-1 rounded-lg" role="radiogroup" aria-label="Time range">
            {(Object.keys(RANGE_CONFIG) as RangeKey[]).map((key) => (
              <Button
                key={key}
                variant={range === key ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setRange(key)}
                role="radio"
                aria-checked={range === key}
              >
                {RANGE_CONFIG[key].label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-64">
          <ChartContainer config={CHART_CONFIG} className="h-full aspect-auto">
            <LineChart data={filteredData}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(value) =>
                  value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                orientation="left"
                width={40}
              />
              <Tooltip content={<ChartTooltipContent className="font-mono text-xs" />} />
              <Legend content={<ChartLegendContent className="flex flex-wrap gap-4 justify-center" />} />
              <Line
                type="monotone"
                dataKey="overall"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="highRisk"
                stroke="var(--risk-high)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="critical"
                stroke="var(--risk-critical)"
                strokeWidth={2}
                strokeDasharray="2 2"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-foreground" />
            <span>Overall Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-[var(--risk-high)]" />
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-[var(--risk-critical)]" />
            <span>Critical Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
