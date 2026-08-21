"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { DemandForecast } from "@/types";
import { formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";

interface DemandForecastChartProps {
  data: DemandForecast;
  className?: string;
  compact?: boolean;
}

const CHART_CONFIG: ChartConfig = {
  historical: { label: "Historical", color: "var(--muted-foreground)" },
  predicted: { label: "Predicted", color: "var(--primary)" },
};

function buildChartData(data: DemandForecast, showPoints: number) {
  const chartData = [];
  const allDates = [...data.dates.slice(-data.historical.length), ...data.dates.slice(-data.predicted.length)];
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

function ForecastLineChart({ data, className }: { data: ReturnType<typeof buildChartData>; className?: string }) {
  return (
    <ChartContainer config={CHART_CONFIG} className={cn("h-full aspect-auto", className)}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatDate(value)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          orientation="left"
          width={40}
        />
        <Tooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="historical"
          stroke="var(--color-historical)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="var(--color-predicted)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function DemandForecastChart({ data, className, compact = false }: DemandForecastChartProps) {
  const [range, setRange] = useState<"7d" | "14d" | "30d">("7d");

  const daysMap = { "7d": 7, "14d": 14, "30d": 30 };
  const days = daysMap[range];
  const totalPoints = data.historical.length + data.predicted.length;
  const showPoints = Math.min(days, totalPoints);
  const chartData = buildChartData(data, showPoints);

  const expectedChange = data.summary.expectedChange;
  const isPositive = expectedChange >= 0;

  if (compact) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Demand Forecast</CardTitle>
            <Badge variant={isPositive ? "default" : "secondary"} className="gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}
              {expectedChange.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-48 px-2 pb-2">
            <ForecastLineChart data={chartData} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Demand Forecast</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPositive ? "default" : "secondary"} className="gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}
              {expectedChange.toFixed(1)}% expected change
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Target className="w-3 h-3" />
              {data.summary.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              Peak: {formatDate(data.summary.peakDay)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["7d", "14d", "30d"] as const).map((key) => (
            <Button
              key={key}
              variant={range === key ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setRange(key)}
            >
              {key === "7d" ? "7 days" : key === "14d" ? "14 days" : "30 days"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="relative h-64 mb-4">
          <ChartContainer config={CHART_CONFIG} className="h-full aspect-auto">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDate(value)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                orientation="left"
                width={45}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent className="flex flex-wrap gap-4 justify-center" />} />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="var(--color-historical)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--color-predicted)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Historical Avg</p>
            <p className="text-2xl font-bold">
              {Math.round(data.historical.reduce((a, b) => a + b, 0) / data.historical.length).toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Predicted Avg</p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(data.predicted.reduce((a, b) => a + b, 0) / data.predicted.length).toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-2xl font-bold">{data.summary.confidence}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Peak Day</p>
            <p className="text-2xl font-bold">{formatDate(data.summary.peakDay)}</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Forecast Summary:</strong> Demand is expected to {isPositive ? "increase" : "decrease"} by{" "}
            <strong>{Math.abs(expectedChange).toFixed(1)}%</strong> over the next {days} days, with the highest
            concentration projected for <strong>{formatDate(data.summary.peakDay)}</strong>. Model confidence:{" "}
            <strong>{data.summary.confidence}%</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
