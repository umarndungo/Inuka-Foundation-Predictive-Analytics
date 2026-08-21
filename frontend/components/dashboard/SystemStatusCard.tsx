"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Wifi, WifiOff, Server, HardDrive, Cpu, Database, CheckCircle, AlertCircle, Loader2, XCircle, TrendingUp, Users, Shield } from "lucide-react";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import type { SystemStatus } from "@/types";

interface SystemStatusCardProps {
  status: SystemStatus | null;
  className?: string;
}

export function SystemStatusCard({ status, className }: SystemStatusCardProps) {
  if (!status) return null;

  const devicePercent = status.devicesTotal > 0 ? (status.devicesOnline / status.devicesTotal) * 100 : 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">System Status</CardTitle>
          <SyncStatusIndicator compact />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Devices Online</p>
              <p className="text-2xl font-bold tabular-nums">{status.devicesOnline.toLocaleString()} / {status.devicesTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Coverage</p>
              <p className="text-2xl font-bold tabular-nums">{devicePercent.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Server className="w-4 h-4" />
                API Latency
              </span>
              <span className="font-mono font-medium">{status.apiLatency}ms</span>
            </div>
            <Progress value={Math.min(status.apiLatency / 200, 1) * 100} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Database className="w-4 h-4" />
                Ingestion Rate
              </span>
              <span className="font-mono font-medium">{status.ingestionRate.toLocaleString()}/min</span>
            </div>
            <Progress value={Math.min(status.ingestionRate / 2000, 1) * 100} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="w-4 h-4" />
                Device Coverage
              </span>
              <span className="font-mono font-medium">{devicePercent.toFixed(1)}%</span>
            </div>
            <Progress value={devicePercent} className="h-1.5" />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Shield className="w-4 h-4 text-success" />
            <span className="flex-1">Data Pipeline</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Cpu className="w-4 h-4 text-success" />
            <span className="flex-1">ML Inference</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 text-primary" />
            <span className="flex-1">SMS Gateway</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Database className="w-4 h-4 text-warning" />
            <span className="flex-1">Offline Queue</span>
            <span className="font-mono font-medium text-warning">{status.devicesTotal - status.devicesOnline}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}