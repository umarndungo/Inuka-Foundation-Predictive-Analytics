import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { FieldMap } from "@/components/dashboard/FieldMap";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { MapPin } from "lucide-react";

export default async function MapPage() {
  const [mapRegions, fieldWorkers] = await Promise.all([
    api.getMapRegions(),
    api.getFieldWorkers(),
  ]);

  const activeWorkers = fieldWorkers.filter((w) => w.isOnline);

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
        <FieldMap />

        {/* Regional Hub Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-border/80 shadow-2xs rounded-xl lg:col-span-2 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-secondary/20">
              <CardTitle className="text-base font-semibold">Regional Operational Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mapRegions.map((region) => (
                <div key={region.code} className="p-4 rounded-lg bg-secondary/50 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-foreground font-mono">{region.name}</span>
                    </div>
                    <StatusBadge
                      status={region.riskScore >= 0.75 ? "high" : "low"}
                      label={`Risk: ${(region.riskScore * 100).toFixed(0)}%`}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-1">
                    <div className="p-2 rounded-md bg-background border border-border">
                      <p className="text-muted-foreground text-[11px]">Beneficiaries</p>
                      <p className="font-bold text-foreground text-sm">{region.beneficiaries}</p>
                    </div>
                    <div className="p-2 rounded-md bg-background border border-border">
                      <p className="text-muted-foreground text-[11px]">At-Risk</p>
                      <p className="font-bold text-primary text-sm">{region.highRisk}</p>
                    </div>
                  </div>
                </div>
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