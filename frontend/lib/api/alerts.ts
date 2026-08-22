import type { Alert } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export async function getAlerts(filters?: { severity?: string; status?: string; region?: string; limit?: number }): Promise<Alert[]> {
  if (USE_MOCK) {
    const { mockAlerts } = await import("@/lib/mock/data");
    let filtered = [...mockAlerts];
    if (filters?.severity && filters.severity !== "all") {
      filtered = filtered.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status && filters.status !== "all") {
      filtered = filtered.filter((a) => a.status === filters.status);
    }
    if (filters?.region && filters.region !== "all") {
      filtered = filtered.filter((a) => a.location.toLowerCase().includes(filters.region!.toLowerCase()));
    }
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    return filtered;
  }

  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
  }

  const res = await fetch(`${API_BASE}/api/v1/alerts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function acknowledgeAlert(id: string): Promise<Alert> {
  if (USE_MOCK) {
    const { mockAlerts } = await import("@/lib/mock/data");
    const alert = mockAlerts.find((a) => a.id === id);
    if (alert) {
      alert.status = "acknowledged";
      alert.acknowledgedAt = new Date().toISOString();
      return { ...alert };
    }
    throw new Error("Alert not found");
  }

  const res = await fetch(`${API_BASE}/api/v1/alerts/${id}/acknowledge`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to acknowledge alert");
  return res.json();
}

export async function resolveAlert(id: string): Promise<Alert> {
  if (USE_MOCK) {
    const { mockAlerts } = await import("@/lib/mock/data");
    const alert = mockAlerts.find((a) => a.id === id);
    if (alert) {
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
      return { ...alert };
    }
    throw new Error("Alert not found");
  }

  const res = await fetch(`${API_BASE}/api/v1/alerts/${id}/resolve`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to resolve alert");
  return res.json();
}
