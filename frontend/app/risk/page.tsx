import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { RiskEvaluatorCard } from "@/components/dashboard/RiskEvaluatorCard";
import { BeneficiariesTable } from "@/components/dashboard/BeneficiariesTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function RiskRadarPage() {
  const [riskDistribution, beneficiariesRes] = await Promise.all([
    api.getRiskDistribution(),
    api.getBeneficiaries({ pageSize: 500 }),
  ]);

  const highRiskBeneficiaries = beneficiariesRes.items.filter(
    (beneficiary) => beneficiary.riskTier === "high" || beneficiary.riskTier === "critical"
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Risk Radar & Dropout Prevention Hub"
          description="Inuka Risk Radar Predictive Engine — Monitor drop-out indicators, examine risk drivers, evaluate live scoring simulations, and trigger emergency field interventions."
        >
          <div className="flex items-center gap-3">
            <StatusBadge
              status="critical"
              label={`${riskDistribution.critical + riskDistribution.high} High & Critical Risk`}
              showDot
              size="sm"
            />
          </div>
        </PageHeader>

        {/* Live Evaluator intentionally hidden from the main risk experience.
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskEvaluatorCard />
          <RiskDistributionChart data={riskDistribution} />
        </div>
        */}

        <RiskDistributionChart data={riskDistribution} />

        {/* High Risk Directory Table */}
        <BeneficiariesTable
          beneficiaries={highRiskBeneficiaries}
          title="High-Risk Beneficiary Directory"
          description="High- and critical-risk beneficiary cases derived from persisted scoring outputs and ready for intervention review."
          defaultRiskFilter="all"
          exportFilePrefix="risk_radar_high_risk"
          modalDescription="Detailed high-risk beneficiary profile and recommended intervention guide."
          recommendedActionLabel="Intervention Action"
        />
      </div>
    </DashboardLayout>
  );
}