import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { RegionalForecastSelector } from "@/components/dashboard/RegionalForecastSelector";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const REGIONS = ["Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret"];

export default async function ForecastsPage() {
  const [nationalForecast, regionalBreakdown, ...regionForecasts] = await Promise.all([
    api.getDemandForecast("National", 30),
    api.getRegionalDemandBreakdown(),
    ...REGIONS.map((r) => api.getDemandForecast(r, 30)),
  ]);

  const expectedChange = nationalForecast.summary.expectedChange;
  const isPositive = expectedChange >= 0;
  const allocationRows = [...regionalBreakdown]
    .sort((a, b) => b.predicted_demand - a.predicted_demand)
    .slice(0, 6);
  const totalPredictedDemand = allocationRows.reduce((sum, row) => sum + row.predicted_demand, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Predictive Demand & Kit Allocation Forecasts"
          description="Forecasts and allocation priorities derived from persisted synthetic beneficiary demand signals across regional hubs."
        >
          <div className="flex items-center gap-3">
            <StatusBadge
              status={isPositive ? "high" : "low"}
              label={`${isPositive ? "+" : ""}${expectedChange.toFixed(1)}% Expected Demand Change`}
              showDot={isPositive}
              size="sm"
            />
          </div>
        </PageHeader>

        <DemandForecastChart data={nationalForecast} />

        <RegionalForecastSelector forecasts={regionForecasts.filter(Boolean)} />

        <Card className="border-none shadow-none rounded-md bg-card overflow-hidden">
          <CardHeader className="p-3.5 border-b border-border/40 bg-secondary/20">
            <CardTitle className="text-sm font-semibold font-mono uppercase tracking-wider">
              Resource Allocation Priorities
            </CardTitle>
            <CardDescription className="text-xs">
              Regional allocation summary based on persisted demand breakdown outputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {allocationRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No allocation data available for the selected forecast window.</p>
            ) : (
              <div className="space-y-3">
                {allocationRows.map((row) => {
                  const share = totalPredictedDemand > 0 ? (row.predicted_demand / totalPredictedDemand) * 100 : 0;
                  const regionalDirection = row.summary.expectedChange >= 0 ? "+" : "";

                  return (
                    <div key={row.region} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{row.region}</p>
                          <p className="text-xs text-muted-foreground">
                            {regionalDirection}
                            {row.summary.expectedChange.toFixed(1)}% vs baseline • {row.summary.confidence}% confidence
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{row.predicted_demand.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{share.toFixed(1)}% of displayed demand</p>
                        </div>
                      </div>
                      <div className="h-2 rounded bg-secondary overflow-hidden">
                        <div className="h-full rounded bg-primary" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
