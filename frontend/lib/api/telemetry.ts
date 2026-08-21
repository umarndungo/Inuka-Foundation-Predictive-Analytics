import type { TelemetryEvent } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export function getTelemetryStreamUrl(): string {
  return `${API_BASE}/api/v1/telemetry/stream`;
}

export async function getTelemetryEvents(limit = 100): Promise<TelemetryEvent[]> {
  if (USE_MOCK) {
    const { mockTelemetryEvents } = await import("@/lib/mock/data");
    return mockTelemetryEvents.slice(0, limit);
  }

  const res = await fetch(`${API_BASE}/api/v1/telemetry/events?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch telemetry events");
  return res.json();
}
