"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "@/components/ui/chart";
import type { DemandForecast } from "@/types";
import { formatDate } from "@/lib/utils";
import { Target, Sparkles } from "lucide-react";

interface DemandForecastChartProps {
  data: DemandForecast;
  className?: string;
  compact?: boolean;
}

const CHART_CONFIG: ChartConfig = {
  historical: { label: "Historical Baseline", color: "#71717A" },
  predicted: { label: "AI Forecast Demand", color: "var(--primary)" },
};

function buildChartData(data: DemandForecast, showPoints: number) {
  const chartData = [];
  const historicalDates = data.dates.slice(0, data.historical.length);
  const predictedDates = data.dates.slice(data.historical.length, data.historical.length + data.predicted.length);
  const allDates = [...historicalDates, ...predictedDates];
  const allHistorical = [...data.historical, ...Array(data.predicted.length).fill(null)];
  const allPredicted = [...Array(data.historical.length).fill(null), ...data.predicted];

  for (let i = Math.max(0, allDates.length - showPoints); i < allDates.length; i++) {
    chartData.push({
      date: allDates[i],
      historical: allHistorical[i],
      predicted: allPredicted[i],
    });
  }

  return chartData;
}

export function DemandForecastChart({ data, className, compact = false }: DemandForecastChartProps) {
  const [range, setRange] = useState<"7d" | "14d" | "30d">("14d");

  const daysMap = { "7d": 7, "14d": 14, "30d": 30 } as const;
  const totalForecastPoints = data.predicted.length;
  const availableRange: Array<"7d" | "14d" | "30d"> =
    totalForecastPoints >= 30 ? ["7d", "14d", "30d"] : totalForecastPoints >= 14 ? ["7d", "14d"] : ["7d"];
  const effectiveRange = availableRange.includes(range) ? range : availableRange[availableRange.length - 1];
  const showForecastDays = Math.min(daysMap[effectiveRange], totalForecastPoints);
  const showPoints = Math.min(data.historical.length + showForecastDays, data.historical.length + data.predicted.length);
  const chartData = buildChartData(data, showPoints);

  const expectedChange = data.summary.expectedChange;
  const isPositive = expectedChange >= 0;
  const historicalBaseline = data.historical.length > 0 ? Math.round(data.historical.reduce((a, b) => a + b, 0) / data.historical.length) : 0;
  const predictedPeak = data.predicted.length > 0 ? Math.max(...data.predicted) : 0;

  return (
    <Card className={cn("h-full flex flex-col border-none shadow-none rounded-md bg-card overflow-hidden", className)}>
      <CardHeader className="p-3.5 border-b border-border/40 bg-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-mono uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-primary" />
              {data.region} Resource Allocation & Kit Demand Forecast
            </CardTitle>
            <CardDescription className="text-xs">
              Persisted synthetic-demand forecast for field kit distribution and staff deployment in {data.region}.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={isPositive ? "high" : "low"}
              label={`${isPositive ? "+" : ""}${expectedChange.toFixed(1)}% vs Baseline`}
              showDot={isPositive}
              size="sm"
            />

            <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/40 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              {data.summary.confidence}% Confidence
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5">
          <div className="flex gap-1 bg-secondary/60 p-0.5 rounded border border-border/40">
            {availableRange.map((key) => (
              <Button
                key={key}
                variant={effectiveRange === key ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs font-mono font-medium rounded transition-colors cursor-pointer",
                  effectiveRange === key && "bg-background text-foreground shadow-none border border-border/40"
                )}
                onClick={() => setRange(key)}
              >
                {key === "7d" ? "7 Days" : key === "14d" ? "14 Days" : "30 Days"}
              </Button>
            ))}
          </div>

          <span className="hidden md:inline text-xs text-muted-foreground font-mono">
            Peak Demand: <strong className="text-foreground">{formatDate(data.summary.peakDay)}</strong>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 space-y-5">
        <div className="w-full h-72 min-h-[280px]">
          <ChartContainer config={CHART_CONFIG} className="w-full h-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDate(value)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                orientation="left"
                width={36}
              />
              <Tooltip content={<ChartTooltipContent className="font-mono text-xs rounded border border-border/40 shadow-none" />} />
              <Legend content={<ChartLegendContent className="flex flex-wrap gap-4 justify-center pt-2 text-xs font-mono" />} />
              <Area
                type="monotone"
                dataKey="historical"
                stroke="#71717A"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="transparent"
                dot={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#predictedGrad)"
                dot={{ r: 2.5, fill: "#EF4444" }}
                connectNulls={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded bg-secondary/50 border border-border/40 text-xs space-y-0.5">
            <span className="text-muted-foreground block text-[11px] font-mono">Historical Baseline</span>
            <span className="text-lg font-bold font-sans text-foreground">
              {historicalBaseline.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs space-y-0.5">
            <span className="text-primary font-semibold font-mono block text-[11px]">Predicted Peak</span>
            <span className="text-lg font-bold font-sans text-primary">{predictedPeak.toLocaleString()}</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border/40 text-xs space-y-0.5">
            <span className="text-muted-foreground block text-[11px] font-mono">Model Confidence</span>
            <span className="text-lg font-bold font-sans text-foreground">{data.summary.confidence}%</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border/40 text-xs space-y-0.5">
            <span className="text-muted-foreground block text-[11px] font-mono">Peak Demand Date</span>
            <span className="text-xs font-bold font-sans text-foreground truncate block">{formatDate(data.summary.peakDay)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
