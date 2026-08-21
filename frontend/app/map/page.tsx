import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FieldMap } from "@/components/dashboard/FieldMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockMapRegions, mockBeneficiaries, mockFieldWorkers } from "@/lib/mock/data";
import { MapPin, Users, AlertTriangle, CheckCircle, Wifi, WifiOff, Filter, Download, Layers, Navigation } from "lucide-react";

export default function MapPage() {
  const totalBeneficiaries = mockMapRegions.reduce((sum, r) => sum + r.beneficiaries, 0);
  const totalHighRisk = mockMapRegions.reduce((sum, r) => sum + r.highRisk, 0);
  const onlineWorkers = mockFieldWorkers.filter((w) => w.isOnline).length;
  const totalWorkers = mockFieldWorkers.length;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Field Map</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Geographic intelligence — Visualize beneficiary distribution, risk clusters, and field operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {mockMapRegions.length} Regions
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3.5 h-3.5" />
              {totalBeneficiaries} Beneficiaries
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 h-[720px]">
            <FieldMap />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-h3">Regions</CardTitle>
                  <Badge variant="secondary">{mockMapRegions.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockMapRegions.map((region) => (
                  <div key={region.name} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium text-small">{region.name}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-caption",
                        region.riskScore > 0.4 ? "bg-[var(--risk-high)]/10 text-[var(--risk-high)]" : "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)]"
                      )}>
                        {region.riskScore > 0.4 ? "High" : "Moderate"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-small">
                      <div>
                        <p className="text-muted-foreground">Beneficiaries</p>
                        <p className="font-semibold">{region.beneficiaries}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">High Risk</p>
                        <p className="font-semibold text-[var(--risk-high)]">{region.highRisk}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-caption text-muted-foreground">Risk Score: <span className="font-mono font-medium">{region.riskScore.toFixed(2)}</span></p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-h3">Field Workers</CardTitle>
                  <Badge variant={onlineWorkers === totalWorkers ? "default" : "secondary"} className="gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full", onlineWorkers === totalWorkers ? "bg-success" : "bg-warning")} />
                    {onlineWorkers}/{totalWorkers} Online
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-72 overflow-y-auto">
                {mockFieldWorkers.map((worker) => (
                  <div key={worker.id} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", worker.isOnline ? "bg-success" : "bg-muted-foreground")} />
                        <span className="font-medium text-small">{worker.name}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-caption", worker.isOnline ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground")}>
                        {worker.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-caption text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{worker.region}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{worker.assignedBeneficiaries}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-h3">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="font-medium text-small">Navigate to High-Risk Cluster</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                  <Download className="w-5 h-5 text-primary" />
                  <span className="font-medium text-small">Export Map Data (GeoJSON)</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                  <Layers className="w-5 h-5 text-primary" />
                  <span className="font-medium text-small">Configure Map Layers</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                  <Filter className="w-5 h-5 text-primary" />
                  <span className="font-medium text-small">Filter by Risk Threshold</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h3">High-Risk Beneficiary Clusters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mockBeneficiaries
                .filter((b) => b.riskTier === "critical" || b.riskTier === "high")
                .slice(0, 8)
                .map((beneficiary) => (
                  <div key={beneficiary.id} className="p-4 rounded-lg bg-muted/50 border-l-4" style={{ borderColor: `var(--risk-${beneficiary.riskTier})` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-medium text-small">{beneficiary.code}</span>
                      <Badge variant="outline" className={cn("text-caption", "bg-[var(--risk-" + beneficiary.riskTier + ")]/10 text-[var(--risk-" + beneficiary.riskTier + ")]")}>
                        {beneficiary.riskTier.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-caption text-muted-foreground">{beneficiary.name}</p>
                    <p className="text-caption text-muted-foreground">{beneficiary.region}, {beneficiary.subCounty}</p>
                    <p className="text-caption font-semibold" style={{ color: `var(--risk-${beneficiary.riskTier})` }}>{beneficiary.riskScore}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}