import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HighRiskBeneficiaries } from "@/components/dashboard/HighRiskBeneficiaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockBeneficiaries } from "@/lib/mock/data";
import { Users, Filter, Download, Eye, MapPin, AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

export default function BeneficiariesPage() {
  const criticalBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "critical");
  const highBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "high");
  const mediumBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "medium");
  const lowBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "low");

  const regions = [...new Set(mockBeneficiaries.map((b) => b.region))].sort();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Beneficiaries</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Complete beneficiary registry — Search, filter, and monitor all program participants.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 bg-[var(--risk-critical)]/10 text-[var(--risk-critical)] border-[var(--risk-critical)]/20">
              <XCircle className="w-3.5 h-3.5" />
              {criticalBeneficiaries.length} Critical
            </Badge>
            <Badge variant="outline" className="gap-1 bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-[var(--risk-high)]/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {highBeneficiaries.length} High
            </Badge>
            <Badge variant="outline" className="gap-1 bg-[var(--risk-medium)]/10 text-[var(--risk-medium)] border-[var(--risk-medium)]/20">
              <AlertCircle className="w-3.5 h-3.5" />
              {mediumBeneficiaries.length} Medium
            </Badge>
            <Badge variant="outline" className="gap-1 bg-[var(--risk-low)]/10 text-[var(--risk-low)] border-[var(--risk-low)]/20">
              <CheckCircle className="w-3.5 h-3.5" />
              {lowBeneficiaries.length} Low
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-h3">All Beneficiaries</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {mockBeneficiaries.length} Total
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({mockBeneficiaries.length})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({criticalBeneficiaries.length})</TabsTrigger>
                <TabsTrigger value="high">High ({highBeneficiaries.length})</TabsTrigger>
                <TabsTrigger value="medium">Medium ({mediumBeneficiaries.length})</TabsTrigger>
                <TabsTrigger value="low">Low ({lowBeneficiaries.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <HighRiskBeneficiaries beneficiaries={mockBeneficiaries} />
              </TabsContent>
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">By Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {regions.map((region) => {
                const count = mockBeneficiaries.filter((b) => b.region === region).length;
                const highRisk = mockBeneficiaries.filter((b) => b.region === region && (b.riskTier === "high" || b.riskTier === "critical")).length;
                return (
                  <div key={region} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-small">{region}</p>
                      <p className="text-caption text-muted-foreground">{count} beneficiaries</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--risk-high)]">{highRisk} high-risk</p>
                      <p className="text-caption text-muted-foreground">{(highRisk / count * 100).toFixed(1)}% rate</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">By Grade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[3, 4, 5, 6, 7, 8].map((grade) => {
                const count = mockBeneficiaries.filter((b) => b.grade === grade).length;
                const highRisk = mockBeneficiaries.filter((b) => b.grade === grade && (b.riskTier === "high" || b.riskTier === "critical")).length;
                return (
                  <div key={grade} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-small">Grade {grade}</p>
                      <p className="text-caption text-muted-foreground">{count} beneficiaries</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--risk-high)]">{highRisk} high-risk</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["M", "F"].map((gender) => {
                const count = mockBeneficiaries.filter((b) => b.gender === gender).length;
                const highRisk = mockBeneficiaries.filter((b) => b.gender === gender && (b.riskTier === "high" || b.riskTier === "critical")).length;
                return (
                  <div key={gender} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-small">{gender === "M" ? "Male" : "Female"}</p>
                      <p className="text-caption text-muted-foreground">{count} beneficiaries</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--risk-high)]">{highRisk} high-risk</p>
                      <p className="text-caption text-muted-foreground">{(highRisk / count * 100).toFixed(1)}% rate</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}