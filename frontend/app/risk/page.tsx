import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { HighRiskBeneficiaries } from "@/components/dashboard/HighRiskBeneficiaries";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { RiskBadge, BeneficiaryRiskBadge } from "@/components/dashboard/RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockRiskDistribution, mockRiskTrend, mockBeneficiaries, mockAlerts, mockRegionalForecasts } from "@/lib/mock/data";
import { AlertTriangle, Users, TrendingUp, MapPin, Filter, Download, Eye, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { formatRiskScore, getRiskTierLabel } from "@/lib/utils";

export default function RiskAnalysisPage() {
  const criticalBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "critical");
  const highBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "high");
  const mediumBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "medium");
  const lowBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "low");

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Risk Analysis</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Beneficiary risk intelligence — Identify, prioritize, and track at-risk beneficiaries across all regions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 bg-[var(--risk-critical)]/10 text-[var(--risk-critical)] border-[var(--risk-critical)]/20">
              <AlertCircle className="w-3.5 h-3.5" />
              {criticalBeneficiaries.length} Critical
            </Badge>
            <Badge variant="outline" className="gap-1 bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-[var(--risk-high)]/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {highBeneficiaries.length} High
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskDistributionChart data={mockRiskDistribution} />
          <RiskTrendChart data={mockRiskTrend} />
        </div>

        <Tabs defaultValue="critical" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="critical">Critical ({criticalBeneficiaries.length})</TabsTrigger>
            <TabsTrigger value="high">High ({highBeneficiaries.length})</TabsTrigger>
            <TabsTrigger value="medium">Medium ({mediumBeneficiaries.length})</TabsTrigger>
            <TabsTrigger value="low">Low ({lowBeneficiaries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="critical">
            <HighRiskBeneficiaries beneficiaries={criticalBeneficiaries} />
          </TabsContent>
          <TabsContent value="high">
            <HighRiskBeneficiaries beneficiaries={highBeneficiaries} />
          </TabsContent>
          <TabsContent value="medium">
            <HighRiskBeneficiaries beneficiaries={mediumBeneficiaries} />
          </TabsContent>
          <TabsContent value="low">
            <HighRiskBeneficiaries beneficiaries={lowBeneficiaries} />
          </TabsContent>
        </Tabs>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">Risk Drivers Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Low Attendance", count: 1240, color: "var(--risk-high)", icon: AlertTriangle },
                  { label: "Poor Engagement", count: 980, color: "var(--risk-medium)", icon: Users },
                  { label: "Long Travel Distance", count: 760, color: "var(--risk-critical)", icon: MapPin },
                  { label: "Device Inactivity", count: 540, color: "var(--risk-high)", icon: AlertCircle },
                  { label: "Assignment Non-completion", count: 1100, color: "var(--risk-medium)", icon: TrendingUp },
                  { label: "Geographic Isolation", count: 420, color: "var(--risk-critical)", icon: MapPin },
                ].map((driver) => (
                  <div key={driver.label} className="p-5 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <driver.icon className="w-5 h-5" style={{ color: driver.color }} />
                      <span className="font-medium text-small">{driver.label}</span>
                    </div>
                    <p className="text-h2 font-semibold" style={{ color: driver.color }}>{driver.count.toLocaleString()}</p>
                    <p className="text-caption text-muted-foreground mt-1">beneficiaries affected</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}