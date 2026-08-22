import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { HighRiskBeneficiaries } from "@/components/dashboard/HighRiskBeneficiaries";
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
  ] = await Promise.all([
    api.getKPIMetrics(),
    api.getRiskDistribution(),
    api.getBeneficiaries({ pageSize: 10, riskTier: "high" }),
    api.getDemandForecast("National"),
  ]);

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
                  <StatusBadge status="critical" label="21.9%" size="sm" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-foreground tracking-tight pt-1 tabular-nums">
                  2,080 <span className="text-xs font-normal text-muted-foreground font-sans">Beneficiaries</span>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed text-xs">
                Predictive algorithms flag beneficiaries showing early indicator signals (attendance decline, device inactivity) to prioritize preventive field actions before dropout occurs.
              </p>

              <div className="space-y-3 pt-3.5 border-t border-border/40 text-muted-foreground font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span>Primary Risk Driver:</span>
                  <span className="font-medium text-foreground">Engagement Dip</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Peak Region Surge:</span>
                  <span className="font-medium text-primary flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Nairobi (+22.5%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Model Confidence:</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> 91.4%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actionable High Risk Beneficiaries Directory */}
        <HighRiskBeneficiaries beneficiaries={beneficiariesRes.items} />
      </div>
    </DashboardLayout>
  );
}