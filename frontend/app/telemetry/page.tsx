import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TelemetryStream } from "@/components/dashboard/TelemetryStream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTelemetryEvents } from "@/lib/mock/data";
import { Wifi, Activity, Cpu, HardDrive, MapPin, Zap, CheckCircle, AlertTriangle, AlertCircle, Filter, Download, Trash2 } from "lucide-react";

export default function TelemetryPage() {
  const eventsByType = {
    attendance: mockTelemetryEvents.filter((e) => e.eventType === "attendance"),
    engagement: mockTelemetryEvents.filter((e) => e.eventType === "engagement"),
    location: mockTelemetryEvents.filter((e) => e.eventType === "location"),
    device_health: mockTelemetryEvents.filter((e) => e.eventType === "device_health"),
    assignment: mockTelemetryEvents.filter((e) => e.eventType === "assignment"),
  };

  const eventsBySeverity = {
    info: mockTelemetryEvents.filter((e) => e.severity === "info"),
    warning: mockTelemetryEvents.filter((e) => e.severity === "warning"),
    error: mockTelemetryEvents.filter((e) => e.severity === "error"),
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Live Telemetry</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Real-time field data stream — Monitor device signals, attendance, engagement, and system health.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {mockTelemetryEvents.length} events
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-h3">Event Stream</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 bg-[var(--risk-critical)]/10 text-[var(--risk-critical)] border-[var(--risk-critical)]/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {eventsBySeverity.error.length} Errors
                    </Badge>
                    <Badge variant="outline" className="gap-1 bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-[var(--risk-high)]/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {eventsBySeverity.warning.length} Warnings
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {eventsBySeverity.info.length} Info
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <TelemetryStream />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-h3">Event Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "attendance", icon: CheckCircle, label: "Attendance", count: eventsByType.attendance.length, color: "text-success" },
                  { type: "engagement", icon: Zap, label: "Engagement", count: eventsByType.engagement.length, color: "text-primary" },
                  { type: "location", icon: MapPin, label: "Location", count: eventsByType.location.length, color: "text-info" },
                  { type: "device_health", icon: Cpu, label: "Device Health", count: eventsByType.device_health.length, color: "text-warning" },
                  { type: "assignment", icon: HardDrive, label: "Assignments", count: eventsByType.assignment.length, color: "text-info" },
                ].map(({ type, icon: Icon, label, count, color }) => (
                  <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5", color)} />
                      <span className="font-medium text-small">{label}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-h3">Severity Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { severity: "error", icon: AlertCircle, label: "Errors", count: eventsBySeverity.error.length, color: "text-destructive" },
                  { severity: "warning", icon: AlertTriangle, label: "Warnings", count: eventsBySeverity.warning.length, color: "text-warning" },
                  { severity: "info", icon: CheckCircle, label: "Info", count: eventsBySeverity.info.length, color: "text-success" },
                ].map(({ severity, icon: Icon, label, count, color }) => (
                  <div key={severity} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5", color)} />
                      <span className="font-medium text-small">{label}</span>
                    </div>
                    <Badge variant={severity === "error" ? "destructive" : severity === "warning" ? "default" : "secondary"}>{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-h3">Top Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: "KSM-204", region: "Kisumu", events: 47, status: "warning" },
                  { id: "NRB-089", region: "Nairobi", events: 42, status: "ok" },
                  { id: "NKR-112", region: "Nakuru", events: 38, status: "warning" },
                  { id: "MBA-078", region: "Mombasa", events: 35, status: "ok" },
                  { id: "ELD-234", region: "Eldoret", events: 31, status: "ok" },
                  { id: "KSM-156", region: "Kisumu", events: 28, status: "error" },
                ].map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-mono font-medium text-small">{device.id}</p>
                        <p className="text-caption text-muted-foreground">{device.region}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-small">{device.events} events</p>
                      <Badge variant={device.status === "error" ? "destructive" : device.status === "warning" ? "default" : "secondary"} className="text-caption">
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h3">Regional Activity (Last Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {["Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret"].map((region) => {
                const count = mockTelemetryEvents.filter((e) => e.region === region).length;
                return (
                  <div key={region} className="p-5 rounded-lg bg-muted/50 text-center">
                    <p className="text-h2 font-semibold text-primary">{count}</p>
                    <p className="text-small text-muted-foreground mt-1">{region}</p>
                    <p className="text-caption text-muted-foreground mt-1">events/hr</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}