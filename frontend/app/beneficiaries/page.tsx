import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeneficiariesTable } from "@/components/dashboard/BeneficiariesTable";
import { RegionCard } from "@/components/dashboard/RegionCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage() {
  const paginatedRes = await api.getBeneficiaries({ pageSize: 500 });
  const beneficiaries = paginatedRes.items;

  const highRiskBeneficiaries = beneficiaries.filter((b) => b.riskTier === "HIGH");

  const regionalSummaries = Object.values(
    beneficiaries.reduce<Record<string, { region: string; count: number; highRisk: number; mediumRisk: number; lowRisk: number }>>((acc, beneficiary) => {
      const key = beneficiary.region;
      if (!acc[key]) {
        acc[key] = { region: beneficiary.region, count: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 };
      }
      acc[key].count += 1;
      if (beneficiary.riskTier === "HIGH") {
        acc[key].highRisk += 1;
      } else if (beneficiary.riskTier === "MEDIUM") {
        acc[key].mediumRisk += 1;
      } else {
        acc[key].lowRisk += 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count || a.region.localeCompare(b.region));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Beneficiary Registry & Risk Directory"
          description="Comprehensive directory of enrolled program participants — Search, filter by risk score, examine risk drivers, and inspect assigned field agents."
        >
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="high" label={`${highRiskBeneficiaries.length} High Risk`} showDot size="sm" />
            <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border/60 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              {paginatedRes.total} Enrolled
            </span>
          </div>
        </PageHeader>

        {/* Actionable Beneficiaries Data Table */}
        <BeneficiariesTable
          beneficiaries={beneficiaries}
          title="Beneficiary Directory"
          description="Persisted beneficiary records with risk scores, top drivers, and recommended follow-up actions."
          defaultRiskFilter="all"
          exportFilePrefix="beneficiary_directory"
          modalDescription="Detailed beneficiary profile sourced from persisted synthetic program data."
          recommendedActionLabel="Recommended Follow-Up"
        />

        {/* Demographic & Cohort Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-secondary/20">
              <CardTitle className="text-base font-semibold">Regional Concentration</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {regionalSummaries.map((summary) => (
                <RegionCard key={summary.region} {...summary} />
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-secondary/20">
              <CardTitle className="text-base font-semibold">Risk Factor Telemetry Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/40 space-y-2">
                <span className="font-semibold text-foreground block">Primary Field Risk Indicators:</span>
                <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                  <li>Attendance Drop &gt;30% over 14 days (64% correlated with dropout)</li>
                  <li>Device telemetry inactivity over 7 days (48% correlated with dropout)</li>
                  <li>Displaced household status combined with remote location (82% correlated)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}