"use client";

import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockAlerts } from "@/lib/mock/data";
import { AlertTriangle, AlertCircle, Info, Database, Wifi, Bell, Filter, Download, Check, X, Clock, MapPin, User } from "lucide-react";

export default function AlertsPage() {
  const alertsByStatus = {
    new: mockAlerts.filter((a) => a.status === "new"),
    acknowledged: mockAlerts.filter((a) => a.status === "acknowledged"),
    resolved: mockAlerts.filter((a) => a.status === "resolved"),
  };

  const alertsBySeverity = {
    critical: mockAlerts.filter((a) => a.severity === "critical"),
    high: mockAlerts.filter((a) => a.severity === "high"),
    medium: mockAlerts.filter((a) => a.severity === "medium"),
    low: mockAlerts.filter((a) => a.severity === "low"),
  };

  const alertsByType = {
    critical_risk: mockAlerts.filter((a) => a.type === "critical_risk"),
    high_risk: mockAlerts.filter((a) => a.type === "high_risk"),
    telemetry_anomaly: mockAlerts.filter((a) => a.type === "telemetry_anomaly"),
    ingestion_failure: mockAlerts.filter((a) => a.type === "ingestion_failure"),
    offline_device: mockAlerts.filter((a) => a.type === "offline_device"),
    forecast_anomaly: mockAlerts.filter((a) => a.type === "forecast_anomaly"),
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Alerts</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Alert management — Monitor, acknowledge, and resolve system alerts and risk notifications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alertsByStatus.new.length} New
            </Badge>
            <Badge variant="outline" className="gap-1 bg-[var(--risk-critical)]/10 text-[var(--risk-critical)] border-[var(--risk-critical)]/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alertsBySeverity.critical.length} Critical
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-3" />
              <p className="text-h1 font-semibold text-destructive">{alertsBySeverity.critical.length}</p>
              <p className="text-small text-muted-foreground mt-1">Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-[var(--risk-high)] mb-3" />
              <p className="text-h1 font-semibold text-[var(--risk-high)]">{alertsBySeverity.high.length}</p>
              <p className="text-small text-muted-foreground mt-1">High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Info className="w-10 h-10 mx-auto text-[var(--risk-medium)] mb-3" />
              <p className="text-h1 font-semibold text-[var(--risk-medium)]">{alertsBySeverity.medium.length}</p>
              <p className="text-small text-muted-foreground mt-1">Medium</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Database className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-h1 font-semibold text-muted-foreground">{alertsBySeverity.low.length}</p>
              <p className="text-small text-muted-foreground mt-1">Low</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-[640px]">
          <CardContent className="p-0 h-full">
            <AlertsFeed
              alerts={mockAlerts}
              onAcknowledge={(id) => console.log("Acknowledge", id)}
              onResolve={(id) => console.log("Resolve", id)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">By Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: "critical_risk", icon: AlertTriangle, label: "Critical Risk", count: alertsByType.critical_risk.length, color: "text-destructive" },
                { type: "high_risk", icon: AlertTriangle, label: "High Risk", count: alertsByType.high_risk.length, color: "text-[var(--risk-high)]" },
                { type: "telemetry_anomaly", icon: Wifi, label: "Telemetry Anomaly", count: alertsByType.telemetry_anomaly.length, color: "text-primary" },
                { type: "ingestion_failure", icon: Database, label: "Ingestion Failure", count: alertsByType.ingestion_failure.length, color: "text-warning" },
                { type: "offline_device", icon: Wifi, label: "Offline Device", count: alertsByType.offline_device.length, color: "text-[var(--risk-medium)]" },
                { type: "forecast_anomaly", icon: AlertCircle, label: "Forecast Anomaly", count: alertsByType.forecast_anomaly.length, color: "text-info" },
              ].map(({ type, icon: Icon, label, count, color }) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", color)} />
                    <span className="font-medium text-small">{label}</span>
                  </div>
                  <Badge variant={type.includes("critical") || type.includes("high") ? "destructive" : "secondary"}>{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { status: "new", icon: Bell, label: "New", count: alertsByStatus.new.length, color: "text-destructive" },
                { status: "acknowledged", icon: Check, label: "Acknowledged", count: alertsByStatus.acknowledged.length, color: "text-primary" },
                { status: "resolved", icon: X, label: "Resolved", count: alertsByStatus.resolved.length, color: "text-success" },
              ].map(({ status, icon: Icon, label, count, color }) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", color)} />
                    <span className="font-medium text-small capitalize">{label}</span>
                  </div>
                  <Badge variant={status === "new" ? "destructive" : status === "acknowledged" ? "default" : "secondary"}>{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">Recent Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAlerts.filter((a) => a.severity === "critical").slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                  <p className="font-medium text-small text-destructive">{alert.description.slice(0, 80)}...</p>
                  <div className="flex items-center gap-2 mt-2 text-caption text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{alert.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(alert.timestamp).toLocaleTimeString()}</span>
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