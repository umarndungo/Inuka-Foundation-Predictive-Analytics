import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { HighRiskBeneficiaries } from "@/components/dashboard/HighRiskBeneficiaries";
import { FieldMap } from "@/components/dashboard/FieldMap";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { TelemetryStream } from "@/components/dashboard/TelemetryStream";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { mockKPIMetrics, mockRiskDistribution, mockRiskTrend, mockBeneficiaries, mockAlerts, mockSystemStatus, mockDemandForecast } from "@/lib/mock/data";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Dashboard</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Real-time program intelligence — Monitor beneficiary risk, field activity, and emerging demand.
            </p>
          </div>
          <div className="flex items-center gap-2 text-small text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              Last updated: Just now
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {mockKPIMetrics.map((metric) => (
            <KPICard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskDistributionChart data={mockRiskDistribution} />
          <RiskTrendChart data={mockRiskTrend} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <HighRiskBeneficiaries beneficiaries={mockBeneficiaries.filter((b) => b.riskTier === "critical" || b.riskTier === "high")} />
          </div>
          <div className="space-y-4">
            <TelemetryStream compact />
            <SystemStatusCard status={mockSystemStatus} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandForecastChart data={mockDemandForecast} />
          <AlertsFeed alerts={mockAlerts} compact />
        </div>

        <div className="h-[480px]">
          <FieldMap />
        </div>
      </div>
    </DashboardLayout>
  );
}