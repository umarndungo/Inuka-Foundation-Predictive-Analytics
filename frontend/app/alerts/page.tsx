import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, Send } from "lucide-react";

export default function AlertsPage() {
  const alerts = [
    {
      id: "ALT-901",
      title: "Critical Dropout Risk Threshold Exceeded",
      beneficiary: "B-1042 • Kevin Otieno",
      region: "Nairobi",
      score: "0.91",
      tier: "critical",
      time: "10 minutes ago",
      description: "Zero activity for 14 consecutive days and 3 consecutive missed assignments. Automatic n8n SMS webhook dispatched to assigned Field Officer.",
      automation: "Twilio SMS & n8n Workflow #204 Triggered",
    },
    {
      id: "ALT-902",
      title: "Demand Spike Surge Warning",
      beneficiary: "Nairobi Sub-County Hub",
      region: "Nairobi",
      score: "0.84",
      tier: "high",
      time: "25 minutes ago",
      description: "+22.5% demand surge predicted for Nairobi regional inventory next week. Additional kit allocation recommended.",
      automation: "Inventory Advisory Logged",
    },
    {
      id: "ALT-903",
      title: "Consecutive Absence Spike",
      beneficiary: "B-2156 • Mary Wanjiku",
      region: "Nakuru",
      score: "0.84",
      tier: "high",
      time: "1 hour ago",
      description: "Attendance dropped 31% over past 7 days. Assigned officer notified.",
      automation: "SMS Notification Sent",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Early Warning Alerts & Automation Dispatch"
          description="Real-time alert engine monitoring system anomaly signals, dropout risk escalation, and n8n / Twilio webhook dispatch statuses."
        >
          <div className="flex items-center gap-3">
            <StatusBadge status="critical" label="3 Active Alerts" showDot size="sm" />
          </div>
        </PageHeader>

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
                        <span>{alert.title}</span>
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">{alert.beneficiary} • {alert.region}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={alert.tier} label={`${alert.tier.toUpperCase()} (${alert.score})`} showDot size="sm" />
                    <span className="text-xs font-mono text-muted-foreground">{alert.time}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <p className="text-foreground leading-relaxed font-sans">{alert.description}</p>
                <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between border border-border/60">
                  <span className="font-mono font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" /> {alert.automation}
                  </span>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-mono gap-1.5 rounded-md border-border/80">
                    <Send className="w-3.5 h-3.5" /> Re-trigger Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}