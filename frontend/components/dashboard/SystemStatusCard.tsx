"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Wifi, Server, HardDrive, Cpu, Database, CheckCircle, Users, Shield } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SystemStatus } from "@/types";

interface SystemStatusCardProps {
  status: SystemStatus | null;
  className?: string;
}

export function SystemStatusCard({ status, className }: SystemStatusCardProps) {
  if (!status) return null;

  const devicePercent = status.devicesTotal > 0 ? (status.devicesOnline / status.devicesTotal) * 100 : 0;
  const offlineCount = status.devicesTotal - status.devicesOnline;

  return (
    <Card className={cn("h-full border border-border shadow-xs bg-card overflow-hidden", className)}>
      <CardHeader className="pb-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">System Status</CardTitle>
          <StatusBadge status={status.isOnline ? "online" : "offline"} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground shrink-0 border border-border">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono font-medium">Devices Online</p>
              <p className="text-xl font-bold font-mono text-foreground tabular-nums">{status.devicesOnline.toLocaleString()} / {status.devicesTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground shrink-0 border border-border">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono font-medium">Coverage</p>
              <p className="text-xl font-bold font-mono text-foreground tabular-nums">{devicePercent.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Server className="w-3.5 h-3.5" />
                API Latency
              </span>
              <span className="font-semibold text-foreground">{status.apiLatency}ms</span>
            </div>
            <Progress value={Math.min(status.apiLatency / 200, 1) * 100} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Database className="w-3.5 h-3.5" />
                Ingestion Rate
              </span>
              <span className="font-semibold text-foreground">{status.ingestionRate.toLocaleString()}/min</span>
            </div>
            <Progress value={Math.min(status.ingestionRate / 2000, 1) * 100} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="w-3.5 h-3.5" />
                Device Coverage
              </span>
              <span className="font-semibold text-foreground">{devicePercent.toFixed(1)}%</span>
            </div>
            <Progress value={devicePercent} className="h-1.5" />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground truncate">Data Pipeline</span>
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground truncate">ML Inference</span>
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground truncate">SMS Gateway</span>
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Database className={cn("w-3.5 h-3.5", offlineCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} />
            <span className="flex-1 text-muted-foreground truncate">Offline Queue</span>
            <span className={cn("font-semibold", offlineCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>{offlineCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}