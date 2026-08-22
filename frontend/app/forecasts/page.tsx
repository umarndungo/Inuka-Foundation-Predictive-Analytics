import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ForecastsPage() {
  const [nationalForecast, nairobiForecast, kisumuForecast] = await Promise.all([
    api.getDemandForecast("National"),
    api.getDemandForecast("Nairobi"),
    api.getDemandForecast("Kisumu"),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Predictive Demand & Kit Allocation Forecasts"
          description="AI time-series predictive modeling for educational kits, nutritional aid, and field officer scheduling across all regional hubs."
        >
          <div className="flex items-center gap-3">
            <StatusBadge status="high" label="+14.2% Demand Surge Expected" showDot size="sm" />
          </div>
        </PageHeader>

        {/* Primary National Forecast Chart */}
        <DemandForecastChart data={nationalForecast} />

        {/* Regional Forecast Comparisons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandForecastChart data={nairobiForecast} compact />
          <DemandForecastChart data={kisumuForecast} compact />
        </div>
      </div>
    </DashboardLayout>
  );
}