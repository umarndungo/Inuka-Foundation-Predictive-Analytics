"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, WifiOff, Pause, Play, Trash2, Filter, Download, AlertTriangle, CheckCircle, Info, AlertCircle, Cpu, HardDrive, MapPin, Zap } from "lucide-react";
import type { TelemetryEvent } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { mockTelemetryEvents } from "@/lib/mock/data";

const EVENT_TYPE_CONFIG = {
  attendance: { icon: CheckCircle, color: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10", label: "Attendance" },
  engagement: { icon: Zap, color: "text-zinc-700 dark:text-zinc-300 bg-zinc-500/10", label: "Engagement" },
  location: { icon: MapPin, color: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10", label: "Location" },
  device_health: { icon: Cpu, color: "text-red-600 dark:text-red-400 bg-red-500/10", label: "Device Health" },
  assignment: { icon: HardDrive, color: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10", label: "Assignment" },
};

const SEVERITY_CONFIG = {
  info: { color: "text-muted-foreground", bg: "bg-muted/50" },
  warning: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  error: { color: "text-red-700 dark:text-red-400 font-bold", bg: "bg-red-600/15" },
};

interface TelemetryStreamProps {
  className?: string;
  compact?: boolean;
}

export function TelemetryStream({ className, compact = false }: TelemetryStreamProps) {
  const [events, setEvents] = useState<TelemetryEvent[]>(mockTelemetryEvents);
  const [isLive, setIsLive] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | "info" | "warning" | "error">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | keyof typeof EVENT_TYPE_CONFIG>("all");
  const [search, setSearch] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((event) => {
    if (severityFilter !== "all" && event.severity !== severityFilter) return false;
    if (typeFilter !== "all" && event.eventType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!event.beneficiaryCode.toLowerCase().includes(s) &&
          !event.deviceId.toLowerCase().includes(s) &&
          !event.region.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!isLive) return;

    const simulateLiveEvents = () => {
      const eventTypes: TelemetryEvent["eventType"][] = ["attendance", "engagement", "location", "device_health", "assignment"];
      const severities: TelemetryEvent["severity"][] = ["info", "info", "info", "warning", "error"];
      const regions = ["Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret"];
      const devices = ["NRB-001", "NRB-002", "KSM-101", "KSM-102", "NKR-201", "NKR-202", "MBA-301", "ELD-401"];
      const beneficiaries = ["B-1001", "B-1002", "B-1003", "B-1004", "B-1005", "B-1006"];

      const newEvent: TelemetryEvent = {
        id: `tel-${Date.now()}`,
        timestamp: new Date().toISOString(),
        beneficiaryId: `ben-${Math.floor(Math.random() * 12)}`,
        beneficiaryCode: beneficiaries[Math.floor(Math.random() * beneficiaries.length)],
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        deviceId: devices[Math.floor(Math.random() * devices.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        value: Math.random(),
        severity: severities[Math.floor(Math.random() * severities.length)],
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 200));
    };

    const interval = setInterval(simulateLiveEvents, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [isLive]);

  const clearEvents = () => setEvents([]);

  if (compact) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Live Telemetry</CardTitle>
            <Badge variant={isLive ? "default" : "secondary"} className="gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-success" : "bg-muted-foreground")} />
              {isLive ? "Live" : "Paused"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="divide-y">
              {filteredEvents.slice(0, 8).map((event) => (
                <CompactTelemetryItem key={event.id} event={event} />
              ))}
              {filteredEvents.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">No events</div>
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
          <CardTitle className="text-base">Live Telemetry</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="cursor-pointer" onClick={() => setIsLive(!isLive)}>
              <StatusBadge status={isLive ? "synced" : "low"} label={isLive ? "Live Stream" : "Paused"} size="sm" />
            </div>
            <Button variant="ghost" size="icon" onClick={clearEvents} aria-label="Clear events">
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as "all" | "info" | "warning" | "error")}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | keyof typeof EVENT_TYPE_CONFIG)}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}><config.icon className="w-3.5 h-3.5 mr-2" />{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="divide-y" ref={containerRef}>
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <WifiOff className="w-8 h-8 opacity-50" />
                  <p>No telemetry events match the current filters</p>
                </div>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <TelemetryItem key={event.id} event={event} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CompactTelemetryItem({ event }: { event: TelemetryEvent }) {
  const typeConfig = EVENT_TYPE_CONFIG[event.eventType];
  const severityConfig = SEVERITY_CONFIG[event.severity];
  const Icon = typeConfig.icon;

  return (
    <div className="p-3 hover:bg-muted/50 transition-colors border-l-2" style={{ borderColor: `var(--${event.severity === "error" ? "destructive" : event.severity === "warning" ? "warning" : "muted"})` }}>
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4 flex-shrink-0", typeConfig.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{event.beneficiaryCode} • {event.deviceId}</p>
          <p className="text-xs text-muted-foreground">{event.region} • {formatRelativeTime(event.timestamp)}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", severityConfig.bg, severityConfig.color)}>
          {event.severity}
        </Badge>
      </div>
    </div>
  );
}

function TelemetryItem({ event }: { event: TelemetryEvent }) {
  const typeConfig = EVENT_TYPE_CONFIG[event.eventType];
  const severityConfig = SEVERITY_CONFIG[event.severity];
  const Icon = typeConfig.icon;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors border-l-2" style={{ borderColor: `var(--${event.severity === "error" ? "destructive" : event.severity === "warning" ? "warning" : "muted"})` }}>
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", typeConfig.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn(typeConfig.color, "gap-1")}>
                <Icon className="w-3 h-3" />
                {typeConfig.label}
              </Badge>
              <Badge variant="outline" className={cn(severityConfig.bg, severityConfig.color, "gap-1")}>
                {event.severity.toUpperCase()}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(event.timestamp)}</span>
          </div>
          <p className="mt-1 text-sm font-medium">{event.beneficiaryCode} • {event.deviceId} • {event.region}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Value: <code className="font-mono">{typeof event.value === "number" ? event.value.toFixed(2) : event.value}</code></span>
            {event.metadata && <span>Metadata: <code className="font-mono">{JSON.stringify(event.metadata).slice(0, 50)}...</code></span>}
          </div>
        </div>
      </div>
    </div>
  );
}