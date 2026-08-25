import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { FieldMap } from "@/components/dashboard/FieldMap";
import { RegionCard } from "@/components/dashboard/RegionCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [mapRegions, fieldWorkers, beneficiariesResult] = await Promise.all([
    api.getMapRegions(),
    api.getFieldWorkers(),
    api.getBeneficiaries({ pageSize: 500 }).catch(() => null),
  ]);

  const beneficiaries = beneficiariesResult?.items ?? [];
  const activeWorkers = fieldWorkers.filter((w) => w.isOnline);

  const regionalSummaries = Object.values(
    beneficiaries.reduce<Record<string, { region: string; count: number; highRisk: number; mediumRisk: number; lowRisk: number }>>((acc, b) => {
      if (!acc[b.region]) {
        acc[b.region] = { region: b.region, count: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 };
      }
      acc[b.region].count += 1;
      if (b.riskTier === "HIGH") acc[b.region].highRisk += 1;
      else if (b.riskTier === "MEDIUM") acc[b.region].mediumRisk += 1;
      else acc[b.region].lowRisk += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Geographic Intelligence & Spatial Operations"
          description="Interactive MapLibre GIS viewer — Regional risk heatmaps, active field agent locations, and regional operational metrics across Kenya."
        >
          <div className="flex items-center gap-3">
            <StatusBadge status="synced" label={`${activeWorkers.length} Field Agents Active`} size="sm" />
          </div>
        </PageHeader>

        {/* Spatial Map Component */}
        <FieldMap
          mapRegions={mapRegions}
          fieldWorkers={fieldWorkers}
          beneficiaries={beneficiaries}
        />

        {/* Regional Hub Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-border/80 shadow-2xs rounded-xl lg:col-span-2 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-secondary/20">
              <CardTitle className="text-base font-semibold">Regional Operational Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regionalSummaries.map((summary) => (
                <RegionCard key={summary.region} {...summary} />
              ))}
            </CardContent>
          </Card>

          {/* Active Field Workers Roster */}
          <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-secondary/20">
              <CardTitle className="text-base font-semibold">Active Field Agent Roster</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 max-h-[420px] overflow-y-auto">
              {fieldWorkers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/40 text-xs">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-secondary text-foreground font-mono font-semibold text-xs">
                        {worker.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground font-mono">{worker.name}</p>
                      <p className="text-muted-foreground text-[11px] font-mono">{worker.region} Hub</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={worker.isOnline ? "online" : "offline"} size="sm" />
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">{worker.assignedBeneficiaries} assigned</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}