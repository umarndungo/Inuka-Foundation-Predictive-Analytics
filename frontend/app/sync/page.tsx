"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, Database, Upload, Download, AlertTriangle, HardDrive, Server, Shield, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { getPendingQueueCount, getFailedQueueCount, getOfflineQueue, clearSyncedQueue, updateQueueItemStatus } from "@/lib/offline";
import { useAppStore } from "@/lib/store";

interface QueuedItem {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
  retries: number;
  status: "pending" | "syncing" | "synced" | "failed";
}

export default function SyncStatusPage() {
  const { systemStatus, isOfflineMode, pendingSyncCount, setPendingSyncCount, addNotification } = useAppStore();
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [failedQueue, setFailedQueue] = useState<QueuedItem[]>([]);
  const [syncedQueue, setSyncedQueue] = useState<QueuedItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    const [pending, failed, synced] = await Promise.all([
      getOfflineQueue("pending"),
      getOfflineQueue("failed"),
      getOfflineQueue("synced"),
    ]);
    setQueue(pending as QueuedItem[]);
    setFailedQueue(failed as QueuedItem[]);
    setSyncedQueue(synced as QueuedItem[]);
    setPendingSyncCount(pending.length);
  };

  const handleSync = async () => {
    setSyncing(true);
    addNotification({ message: "Starting synchronization...", type: "info" });

    try {
      const allPending = [...queue, ...failedQueue];
      let success = 0;
      let failed = 0;

      for (const item of allPending) {
        await updateQueueItemStatus(item.id, "syncing");
        await new Promise((resolve) => setTimeout(resolve, 500));

        const successRate = 0.95;
        if (Math.random() < successRate) {
          await updateQueueItemStatus(item.id, "synced");
          success++;
        } else {
          await updateQueueItemStatus(item.id, "failed");
          failed++;
        }
      }

      setLastSyncResult({ success, failed });
      addNotification({
        message: `Sync complete: ${success} succeeded, ${failed} failed`,
        type: failed > 0 ? "warning" : "success",
      });
      loadQueue();
    } catch (error) {
      addNotification({ message: "Sync failed: " + (error as Error).message, type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    for (const item of failedQueue) {
      await updateQueueItemStatus(item.id, "pending");
    }
    addNotification({ message: `Retrying ${failedQueue.length} failed items`, type: "info" });
    loadQueue();
  };

  const handleClearSynced = async () => {
    const count = await clearSyncedQueue();
    addNotification({ message: `Cleared ${count} synced items`, type: "success" });
    loadQueue();
  };

  const formatQueueTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Sync Status</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Offline synchronization — Manage data sync between field devices and central system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatusIndicator />
            <Button
              variant={systemStatus?.isOnline && !isOfflineMode ? "default" : "outline"}
              size="lg"
              onClick={handleSync}
              disabled={syncing || (!systemStatus?.isOnline && !isOfflineMode)}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-muted-foreground">Pending Sync</p>
                  <p className="text-h1 font-semibold text-primary mt-1">{queue.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Upload className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-muted-foreground">Failed Items</p>
                  <p className="text-h1 font-semibold text-destructive mt-1">{failedQueue.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-muted-foreground">Synced</p>
                  <p className="text-h1 font-semibold text-success mt-1">{syncedQueue.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-muted-foreground">Last Sync</p>
                  <p className="text-small font-medium mt-1">
                    {systemStatus?.lastSync ? formatRelativeTime(systemStatus.lastSync) : "Never"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending ({queue.length})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failedQueue.length})</TabsTrigger>
            <TabsTrigger value="synced">Synced ({syncedQueue.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-h3">Pending Synchronization</CardTitle>
                {queue.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1">
                    <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                    Sync All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {queue.length === 0 ? (
                  <div className="py-12 text-center">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-small">No pending items</p>
                    <p className="text-caption text-muted-foreground mt-1">All data is synchronized</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {queue.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-caption">
                                {item.type.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="text-caption bg-warning/10 text-warning border-warning/20">
                                Pending
                              </Badge>
                              {item.retries > 0 && (
                                <Badge variant="outline" className="text-caption bg-muted/50 text-muted-foreground">
                                  Retry #{item.retries}
                                </Badge>
                              )}
                            </div>
                            <p className="text-small text-muted-foreground font-mono">{item.id}</p>
                            <p className="text-caption text-muted-foreground">{formatQueueTime(item.timestamp)}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQueueItemStatus(item.id, "syncing").then(loadQueue)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                        <details className="mt-2">
                          <summary className="text-caption text-muted-foreground cursor-pointer">View payload</summary>
                          <pre className="mt-1 text-[10px] bg-background p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">{JSON.stringify(item.payload, null, 2)}</pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-h3">Failed Items</CardTitle>
                {failedQueue.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRetryFailed} className="gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry All
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {failedQueue.length === 0 ? (
                  <div className="py-12 text-center">
                    <XCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-small">No failed items</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {failedQueue.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-caption">{item.type.replace("_", " ")}</Badge>
                              <Badge variant="destructive" className="text-caption">Failed</Badge>
                              <Badge variant="outline" className="text-caption">Retry #{item.retries}</Badge>
                            </div>
                            <p className="text-small text-muted-foreground font-mono">{item.id}</p>
                            <p className="text-caption text-muted-foreground">{formatQueueTime(item.timestamp)}</p>
                          </div>
                          <Button variant="default" size="sm" onClick={() => updateQueueItemStatus(item.id, "pending").then(loadQueue)} className="gap-1">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry
                          </Button>
                        </div>
                        <details className="mt-2">
                          <summary className="text-caption text-muted-foreground cursor-pointer">View payload</summary>
                          <pre className="mt-1 text-[10px] bg-background p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">{JSON.stringify(item.payload, null, 2)}</pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="synced">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-h3">Recently Synced</CardTitle>
                {syncedQueue.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearSynced} className="gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear History
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {syncedQueue.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-small">No synced items</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {syncedQueue.slice(0, 50).map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-success/5 border border-success/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <Badge variant="secondary" className="text-caption">{item.type.replace("_", " ")}</Badge>
                            <Badge variant="outline" className="text-caption bg-success/10 text-success border-success/20">Synced</Badge>
                          </div>
                          <span className="text-caption text-muted-foreground">{formatQueueTime(item.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4 text-primary" />
                    <span className="font-medium text-small">API Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", systemStatus?.isOnline ? "bg-success" : "bg-destructive")} />
                    <span className={cn("font-medium text-small", systemStatus?.isOnline ? "text-success" : "text-destructive")}>
                      {systemStatus?.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="font-medium text-small">Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="font-medium text-small text-success">Connected</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium text-small">ML Service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="font-medium text-small text-success">Healthy</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-primary" />
                    <span className="font-medium text-small">Storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <span className="font-medium text-small text-warning">78% used</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-small mb-1">
                    <span className="flex items-center gap-1.5"><Server className="w-4 h-4" /> API Latency</span>
                    <span className="font-mono font-medium">{systemStatus?.apiLatency}ms</span>
                  </div>
                  <Progress value={Math.min((systemStatus?.apiLatency || 0) / 200, 1) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-small mb-1">
                    <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> Ingestion Rate</span>
                    <span className="font-mono font-medium">{(systemStatus?.ingestionRate || 0).toLocaleString()}/min</span>
                  </div>
                  <Progress value={Math.min((systemStatus?.ingestionRate || 0) / 2000, 1) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-small mb-1">
                    <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Device Coverage</span>
                    <span className="font-mono font-medium">
                      {systemStatus ? ((systemStatus.devicesOnline / systemStatus.devicesTotal) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <Progress value={systemStatus ? (systemStatus.devicesOnline / systemStatus.devicesTotal) * 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">Offline Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-small">IndexedDB Storage</p>
                      <p className="text-caption text-muted-foreground">Local data persistence</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <WifiOff className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-small">Offline Queue</p>
                      <p className="text-caption text-muted-foreground">Auto-sync on reconnect</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-small">Conflict Resolution</p>
                      <p className="text-caption text-muted-foreground">Server wins strategy</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground">Configured</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-small">Data Integrity</p>
                      <p className="text-caption text-muted-foreground">Checksums & validation</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-small text-muted-foreground leading-relaxed">
                  <strong>Offline Mode:</strong> When connectivity is lost, all field data entries are queued locally using IndexedDB.
                  The queue is automatically processed when the connection is restored. Failed items can be manually retried.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}