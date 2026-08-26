"use client";

import { useEffect, useRef, useState } from "react";
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
import { getTelemetryStreamUrl } from "@/lib/api/telemetry";

const EVENT_TYPE_CONFIG = {
  attendance: { icon: CheckCircle, color: "text-zinc-600 bg-zinc-100", label: "Attendance" },
  engagement: { icon: Zap, color: "text-zinc-700 bg-zinc-100", label: "Engagement" },
  location: { icon: MapPin, color: "text-zinc-600 bg-zinc-100", label: "Location" },
  device_health: { icon: Cpu, color: "text-red-600 bg-red-50", label: "Device Health" },
  assignment: { icon: HardDrive, color: "text-zinc-600 bg-zinc-100", label: "Assignment" },
};

const SEVERITY_CONFIG = {
  info: { color: "text-muted-foreground", bg: "bg-secondary/50" },
  warning: { color: "text-amber-600", bg: "bg-amber-50" },
  error: { color: "text-red-600 font-semibold", bg: "bg-red-50" },
};

interface TelemetryStreamProps {
  className?: string;
  compact?: boolean;
}

function inferEventType(payload: Record<string, unknown>): TelemetryEvent["eventType"] {
  if (typeof payload.attendance_rate === "number") return "attendance";
  if (typeof payload.assignment_completion === "number") return "assignment";
  if (typeof payload.travel_distance_km === "number") return "location";
  return "engagement";
}

function inferSeverity(payload: Record<string, unknown>): TelemetryEvent["severity"] {
  const attendance = typeof payload.attendance_rate === "number" ? payload.attendance_rate : null;
  if (attendance !== null && attendance < 0.55) return "error";
  if (attendance !== null && attendance < 0.7) return "warning";
  return "info";
}

function normalizeTelemetryEvent(payload: Record<string, unknown>): TelemetryEvent {
  const meta = (payload._meta ?? payload.meta ?? {}) as Record<string, unknown>;
  const beneficiaryId = String(payload.beneficiary_id ?? meta.beneficiary_id ?? "unknown");
  const timestamp = String(meta.event_timestamp ?? meta.ingested_at ?? new Date().toISOString());
  const region = String(payload.region ?? "Unknown");
  const eventType = inferEventType(payload);
  const rawValue = payload.attendance_rate ?? payload.assignment_completion ?? payload.travel_distance_km ?? 0;
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;

  return {
    id: String(meta.event_id ?? `${beneficiaryId}-${timestamp}`),
    timestamp,
    beneficiaryId,
    beneficiaryCode: beneficiaryId.toUpperCase(),
    eventType,
    deviceId: String(payload.device_id ?? `${region.slice(0, 3).toUpperCase()}-DEVICE`),
    region,
    value,
    severity: inferSeverity(payload),
    metadata: payload,
  };
}

export function TelemetryStream({ className, compact = false }: TelemetryStreamProps) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
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
    if (!isLive) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const source = new EventSource(getTelemetryStreamUrl());
    eventSourceRef.current = source;

    source.addEventListener("telemetry", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as Record<string, unknown>;
        const normalized = normalizeTelemetryEvent(payload);
        setEvents((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)].slice(0, 200));
      } catch {
        // Ignore malformed SSE payloads and keep stream alive.
      }
    });

    source.addEventListener("error", () => {
      source.close();
      eventSourceRef.current = null;
    });

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
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
    <div className="px-3 py-2.5 hover:bg-secondary/30 transition-colors border-l-2" style={{ borderColor: event.severity === "error" ? "var(--destructive)" : event.severity === "warning" ? "var(--warning)" : "transparent" }}>
      <div className="flex items-center gap-2">
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", typeConfig.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-foreground">{event.beneficiaryCode} <span className="text-muted-foreground">· {event.region}</span></p>
          <p className="text-[11px] text-muted-foreground font-mono">{formatRelativeTime(event.timestamp)}</p>
        </div>
      </div>
    </div>
  );
}

function TelemetryItem({ event }: { event: TelemetryEvent }) {
  const typeConfig = EVENT_TYPE_CONFIG[event.eventType];
  const severityConfig = SEVERITY_CONFIG[event.severity];
  const Icon = typeConfig.icon;

  return (
    <div className="px-4 py-3 hover:bg-secondary/30 transition-colors border-l-2" style={{ borderColor: event.severity === "error" ? "var(--destructive)" : event.severity === "warning" ? "var(--warning)" : "transparent" }}>
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center mt-0.5", typeConfig.color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              {typeConfig.label}
            </span>
            {event.severity !== "info" && (
              <span className={cn("text-[10px] font-mono font-semibold uppercase", severityConfig.color)}>
                {event.severity}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {event.beneficiaryCode} <span className="text-muted-foreground font-mono text-xs">· {event.deviceId}</span>
          </p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span>{event.region}</span>
            <span>{formatRelativeTime(event.timestamp)}</span>
            <span className="text-foreground font-medium">{typeof event.value === "number" ? event.value.toFixed(2) : event.value}</span>
          </div>
        </div>
      </div>
    </div>
  );
}