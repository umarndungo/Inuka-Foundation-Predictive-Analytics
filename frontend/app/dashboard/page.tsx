import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { BeneficiariesTable } from "@/components/dashboard/BeneficiariesTable";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { RiskEvaluatorCard } from "@/components/dashboard/RiskEvaluatorCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Target, TrendingUp, ShieldAlert, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    kpiMetrics,
    riskDistribution,
    beneficiariesRes,
    demandForecast,
    regionalBreakdown,
  ] = await Promise.all([
    api.getKPIMetrics(),
    api.getRiskDistribution(),
    api.getBeneficiaries({ pageSize: 200 }),
    api.getDemandForecast("National", 30),
    api.getRegionalDemandBreakdown(30),
  ]);

  const highRiskBeneficiaries = beneficiariesRes.items.filter(
    (beneficiary) => beneficiary.riskTier === "high" || beneficiary.riskTier === "critical"
  );

  const totalBeneficiaries = riskDistribution.total;
  const highAndCritical = riskDistribution.high + riskDistribution.critical;
  const flaggedShare = totalBeneficiaries > 0 ? (highAndCritical / totalBeneficiaries) * 100 : 0;
  const topRegionalSurge = [...regionalBreakdown].sort((a, b) => b.summary.expectedChange - a.summary.expectedChange)[0];
  const peakRegionLabel = topRegionalSurge
    ? `${topRegionalSurge.region} (${topRegionalSurge.summary.expectedChange >= 0 ? "+" : ""}${topRegionalSurge.summary.expectedChange.toFixed(1)}%)`
    : "No regional forecast data";
  const modelConfidence = demandForecast.summary.confidence;
  const primaryRiskDriver = (() => {
    const driverCounts = highRiskBeneficiaries.reduce<Record<string, number>>((acc, beneficiary) => {
      const driver = beneficiary.riskDrivers[0] || "No dominant driver";
      acc[driver] = (acc[driver] || 0) + 1;
      return acc;
    }, {});

    const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0];
    return topDriver?.[0] || "No dominant driver";
  })();

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        <PageHeader
          title="Predictive Analytics & Forecasting Command Center"
          description="Inuka Foundation Executive Overview — Dropout risk predictions, forecasted kit & resource allocation demand, and targeted beneficiary interventions."
        >
          <div className="flex items-center gap-3">
            <StatusBadge status="synced" label="Models Active & Synced" size="sm" />
          </div>
        </PageHeader>

        {/* Focused KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiMetrics.slice(0, 4).map((metric) => (
            <KPICard key={metric.label} metric={metric} />
          ))}
        </div>

        {/* Interactive Predictive Evaluator */}
        <RiskEvaluatorCard />

        {/* Demand Forecast Section */}
        <DemandForecastChart data={demandForecast} />

        {/* Risk Distribution Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RiskDistributionChart data={riskDistribution} />
          </div>
          <Card className="border-none shadow-none rounded-md flex flex-col justify-between bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-secondary/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 font-mono uppercase tracking-wider text-foreground">
                <Target className="w-4 h-4 text-primary" />
                Target Prediction Focus
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Beneficiary classification breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-primary font-semibold">
                    <ShieldAlert className="w-4 h-4" /> High & Critical Flagged
                  </span>
                  <StatusBadge status={flaggedShare > 0 ? "critical" : "normal"} label={`${flaggedShare.toFixed(1)}%`} size="sm" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-foreground tracking-tight pt-1 tabular-nums">
                  {highAndCritical.toLocaleString()} <span className="text-xs font-normal text-muted-foreground font-sans">of {totalBeneficiaries.toLocaleString()} Beneficiaries</span>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed text-xs">
                Predictive algorithms flag beneficiaries showing early indicator signals (attendance decline, device inactivity) to prioritize preventive field actions before dropout occurs.
              </p>

              <div className="space-y-3 pt-3.5 border-t border-border/40 text-muted-foreground font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span>Primary Risk Driver:</span>
                  <span className="font-medium text-foreground">{primaryRiskDriver}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Peak Region Surge:</span>
                  <span className="font-medium text-primary flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {peakRegionLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Model Confidence:</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> {modelConfidence}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actionable High Risk Beneficiaries Directory */}
        <BeneficiariesTable
          beneficiaries={highRiskBeneficiaries}
          title="High-Risk Beneficiary Directory"
          description="High- and critical-risk beneficiary cases derived from persisted scoring outputs and ready for intervention review."
          defaultRiskFilter="all"
          exportFilePrefix="high_risk_beneficiaries"
          modalDescription="Detailed high-risk beneficiary profile and recommended intervention guide."
          recommendedActionLabel="Intervention Action"
        />
      </div>
    </DashboardLayout>
  );
}