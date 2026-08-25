"use client";

import { useState } from "react";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { DemandForecast } from "@/types";

interface RegionalForecastSelectorProps {
  forecasts: DemandForecast[];
}

export function RegionalForecastSelector({ forecasts }: RegionalForecastSelectorProps) {
  const [selected, setSelected] = useState(forecasts[0]?.region ?? "");

  const active = forecasts.find((f) => f.region === selected) ?? forecasts[0];

  return (
    <Card className="border-none shadow-none rounded-md bg-card overflow-hidden">
      <CardHeader className="p-3.5 border-b border-border/40 bg-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold font-mono uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Regional Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Select a region to view its forecasted kit demand and resource allocation.
            </CardDescription>
          </div>

          <div className="flex gap-1 bg-secondary/60 p-0.5 rounded border border-border/40 flex-wrap">
            {forecasts.map((f) => (
              <button
                key={f.region}
                onClick={() => setSelected(f.region)}
                className={`h-7 px-3 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                  selected === f.region
                    ? "bg-background text-foreground shadow-none border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.region}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {active && <DemandForecastChart data={active} />}
      </CardContent>
    </Card>
  );
}
