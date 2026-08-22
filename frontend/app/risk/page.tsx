import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { RiskEvaluatorCard } from "@/components/dashboard/RiskEvaluatorCard";
import { HighRiskBeneficiaries } from "@/components/dashboard/HighRiskBeneficiaries";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function RiskRadarPage() {
  const [riskDistribution, beneficiariesRes] = await Promise.all([
    api.getRiskDistribution(),
    api.getBeneficiaries({ pageSize: 100 }),
  ]);

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

        {/* Live Evaluator and Risk Distribution Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskEvaluatorCard />
          <RiskDistributionChart data={riskDistribution} />
        </div>

        {/* High Risk Directory Table */}
        <HighRiskBeneficiaries beneficiaries={beneficiariesRes.items} />
      </div>
    </DashboardLayout>
  );
}