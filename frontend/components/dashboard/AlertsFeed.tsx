"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, Check, X, Filter, ChevronDown, AlertCircle, Info, Wifi, Database, MapPin, User } from "lucide-react";
import type { Alert } from "@/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20", label: "Critical" },
  high: { icon: AlertCircle, color: "bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-[var(--risk-high)]/20", label: "High" },
  medium: { icon: Info, color: "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)] border-[var(--risk-medium)]/20", label: "Medium" },
  low: { icon: Database, color: "bg-muted/50 text-muted-foreground border-muted/50", label: "Low" },
};

const TYPE_ICONS = {
  critical_risk: AlertTriangle,
  high_risk: AlertTriangle,
  telemetry_anomaly: Wifi,
  ingestion_failure: Database,
  offline_device: Wifi,
  forecast_anomaly: AlertCircle,
};

interface AlertsFeedProps {
  alerts: Alert[];
  className?: string;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  compact?: boolean;
}

export function AlertsFeed({ alerts, className, onAcknowledge, onResolve, compact = false }: AlertsFeedProps) {
  const [activeTab, setActiveTab] = useState<"all" | "new" | "acknowledged" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab !== "all" && alert.status !== activeTab) return false;
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
    if (typeFilter !== "all" && alert.type !== typeFilter) return false;
    return true;
  });

  const newAlertsCount = alerts.filter((a) => a.status === "new").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status === "new").length;

  if (compact) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Alerts</CardTitle>
            {newAlertsCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {newAlertsCount} new
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="divide-y">
              {filteredAlerts.slice(0, 5).map((alert) => (
                <CompactAlertItem key={alert.id} alert={alert} onAcknowledge={onAcknowledge} onResolve={onResolve} />
              ))}
              {filteredAlerts.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">No alerts</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Alerts</CardTitle>
            {newAlertsCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {newAlertsCount} new
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} critical
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as "all" | "critical" | "high" | "medium" | "low")}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden sm:flex">
              <TabsList className="bg-transparent p-0">
                <TabsTrigger value="all" className="px-3 py-1.5 text-xs">All</TabsTrigger>
                <TabsTrigger value="new" className="px-3 py-1.5 text-xs">New</TabsTrigger>
                <TabsTrigger value="acknowledged" className="px-3 py-1.5 text-xs">Acknowledged</TabsTrigger>
                <TabsTrigger value="resolved" className="px-3 py-1.5 text-xs">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="divide-y">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 opacity-50" />
                  <p>No alerts match the current filters</p>
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CompactAlertItem({ alert, onAcknowledge, onResolve }: { alert: Alert; onAcknowledge?: (id: string) => void; onResolve?: (id: string) => void }) {
  const severity = SEVERITY_CONFIG[alert.severity];
  const Icon = severity.icon;

  return (
    <div className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", severity.color.replace("bg-", "text-").replace("border-", ""))} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">{formatRelativeTime(alert.timestamp)}</span>
            <span>{alert.location}</span>
          </div>
        </div>
        {alert.status === "new" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAcknowledge?.(alert.id)} aria-label="Acknowledge">
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onResolve?.(alert.id)} aria-label="Resolve">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertItem({ alert, onAcknowledge, onResolve }: { alert: Alert; onAcknowledge?: (id: string) => void; onResolve?: (id: string) => void }) {
  const severity = SEVERITY_CONFIG[alert.severity];
  const Icon = severity.icon;
  const TypeIcon = TYPE_ICONS[alert.type] || AlertTriangle;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", severity.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn(severity.color, "gap-1")}>
                <TypeIcon className="w-3 h-3" />
                {alert.type.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className={cn(severity.color, "gap-1")}>
                {severity.label}
              </Badge>
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted/50 gap-1">
                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(alert.timestamp)}</span>
          </div>
          <p className="mt-1 text-sm font-medium">{alert.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location}</span>
            {alert.beneficiaryCode && <span className="flex items-center gap-1"><User className="w-3 h-3" />{alert.beneficiaryCode}</span>}
            {alert.deviceId && <span className="flex items-center gap-1"><Database className="w-3 h-3" />{alert.deviceId}</span>}
          </div>
          {alert.metadata && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">Show details</summary>
              <pre className="mt-1 text-[11px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(alert.metadata, null, 2)}</pre>
            </details>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {alert.status === "new" && (
            <>
              <Button variant="default" size="sm" className="w-full" onClick={() => onAcknowledge?.(alert.id)}>
                <Check className="w-3.5 h-3.5 mr-1" /> Acknowledge
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => onResolve?.(alert.id)}>
                <X className="w-3.5 h-3.5 mr-1" /> Resolve
              </Button>
            </>
          )}
          {alert.status === "acknowledged" && (
            <Button variant="default" size="sm" className="w-full" onClick={() => onResolve?.(alert.id)}>
              <Check className="w-3.5 h-3.5 mr-1" /> Mark Resolved
            </Button>
          )}
          {alert.status === "resolved" && (
            <Badge variant="secondary" className="w-full justify-center">Resolved</Badge>
          )}
        </div>
      </div>
    </div>
  );
}