"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";

export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const { systemStatus, isOfflineMode, pendingSyncCount, setPendingSyncCount } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateCount = async () => {
      const { getPendingQueueCount } = await import("@/lib/offline");
      const count = await getPendingQueueCount();
      setPendingSyncCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 30000);
    return () => clearInterval(interval);
  }, [setPendingSyncCount]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-muted" />
        <span>Loading...</span>
      </div>
    );
  }

  const isOnline = systemStatus?.isOnline && !isOfflineMode;
  const syncStatus = systemStatus?.syncStatus || "synced";
  const lastSync = systemStatus?.lastSync;

  const formatLastSync = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        label: "Offline",
        description: `Last synced ${formatLastSync(lastSync)}`,
      };
    }
    switch (syncStatus) {
      case "syncing":
        return {
          icon: Loader2,
          color: "text-primary",
          bgColor: "bg-primary/10",
          label: "Syncing...",
          description: "Synchronizing data with server",
        };
      case "error":
        return {
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          label: "Sync failed",
          description: "Click to retry synchronization",
        };
      case "synced":
      default:
        return {
          icon: CheckCircle,
          color: "text-success",
          bgColor: "bg-success/10",
          label: "Synced",
          description: `Last synced ${formatLastSync(lastSync)}`,
        };
    }
  };

  const { icon: Icon, color, bgColor, label, description } = getStatusConfig();

if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1", bgColor)}>
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className={cn("font-medium", color)}>{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <div className={cn("relative flex items-center gap-2 rounded-full px-3 py-1.5", bgColor)}>
              <Icon className={cn("w-4 h-4", color)} />
              <span className={cn("text-sm font-medium", color)}>{label}</span>
              {pendingSyncCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                  {pendingSyncCount > 9 ? "9+" : pendingSyncCount}
                </span>
              )}
            </div>
            {syncStatus === "error" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  const { getOfflineQueue } = await import("@/lib/offline");
                  const queue = await getOfflineQueue("failed");
                  for (const item of queue) {
                    await import("@/lib/offline").then(({ updateQueueItemStatus }) =>
                      updateQueueItemStatus(item.id, "pending")
                    );
                  }
                  setPendingSyncCount(queue.length);
                  import("@/lib/store").then(({ useAppStore }) =>
                    useAppStore.getState().addNotification({
                      message: `Retrying ${queue.length} failed sync items`,
                      type: "info",
                    })
                  );
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}