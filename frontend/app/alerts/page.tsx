import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { AlertTriangle, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

function severityStatus(severity: string): "critical" | "high" | "warning" | "normal" {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "warning";
  return "normal";
}

function relativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export default async function AlertsPage() {
  const alerts = await api.getAlerts({ limit: 50 });
  const activeCount = alerts.filter((alert) => alert.status !== "resolved").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Early Warning Alerts & Automation Dispatch"
          description="Real-time alert engine monitoring system anomaly signals, dropout risk escalation, and automation dispatch statuses."
        >
          <div className="flex items-center gap-3">
            <StatusBadge
              status={activeCount > 0 ? "critical" : "normal"}
              label={activeCount > 0 ? `${activeCount} Active Alert${activeCount === 1 ? "" : "s"}` : "No Active Alerts"}
              showDot
              size="sm"
            />
          </div>
        </PageHeader>

        {alerts.length === 0 ? (
          <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
            <CardContent className="p-10 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center border border-border/60">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">No alerts found</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                There are currently no alerts in the operational feed for the selected environment. This is a valid empty state and does not indicate a frontend failure.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border border-border/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-xl bg-card overflow-hidden">
                <CardHeader className="p-4 border-b border-border bg-secondary/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-primary flex items-center justify-center border border-red-200/60 dark:border-red-800/40 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <span className="font-mono text-muted-foreground text-xs">{alert.id}</span>
                          <span>{alert.type.replaceAll("_", " ")}</span>
                        </CardTitle>
                        <CardDescription className="text-xs font-mono">
                          {(alert.beneficiaryCode || alert.beneficiaryId || "Unassigned beneficiary")} • {alert.location}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={severityStatus(alert.severity)}
                        label={`${alert.severity.toUpperCase()} • ${alert.status.toUpperCase()}`}
                        showDot
                        size="sm"
                      />
                      <span className="text-xs font-mono text-muted-foreground">{relativeTime(alert.timestamp)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  <p className="text-foreground leading-relaxed font-sans">{alert.description}</p>
                  <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between border border-border/60">
                    <span className="font-mono font-semibold text-foreground flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      {alert.metadata?.source ? `Source: ${String(alert.metadata.source)}` : "Operational alert recorded"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {alert.deviceId ? `Device ${alert.deviceId}` : "No device attached"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
