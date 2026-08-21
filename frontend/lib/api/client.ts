import type {
  Beneficiary,
  TelemetryEvent,
  RiskDistribution,
  RiskTrendPoint,
  DemandForecast,
  Alert,
  KPIMetric,
  SystemStatus,
  MapRegion,
  FieldWorker,
  ApiResponse,
  PaginatedResponse,
  FilterState,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK) {
    throw new Error("Mock mode enabled");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  async getBeneficiaries(filters?: Partial<FilterState>): Promise<PaginatedResponse<Beneficiary>> {
    if (USE_MOCK) {
      const { mockBeneficiaries } = await import("@/lib/mock/data");
      let filtered = [...mockBeneficiaries];

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.code.toLowerCase().includes(search) ||
            b.name.toLowerCase().includes(search) ||
            b.region.toLowerCase().includes(search)
        );
      }
      if (filters?.region && filters.region !== "all") {
        filtered = filtered.filter((b) => b.region === filters.region);
      }
      if (filters?.riskTier && filters.riskTier !== "all") {
        filtered = filtered.filter((b) => b.riskTier === filters.riskTier);
      }

      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        items: filtered.slice(start, end),
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    }

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return fetchApi(`/api/v1/beneficiaries?${params.toString()}`);
  },

  async getBeneficiary(id: string): Promise<Beneficiary> {
    if (USE_MOCK) {
      const { mockBeneficiaries } = await import("@/lib/mock/data");
      const beneficiary = mockBeneficiaries.find((b) => b.id === id || b.code === id);
      if (!beneficiary) throw new Error("Beneficiary not found");
      return beneficiary;
    }
    return fetchApi(`/api/v1/beneficiaries/${id}`);
  },

  async evaluateRisk(payload: {
    beneficiary_id: string;
    attendance_rate: number;
    assignment_completion: number;
    travel_distance_km: number;
    region: string;
  }): Promise<{
    beneficiary_id: string;
    risk_score: number;
    risk_tier: string;
    drivers: string[];
    recommended_action: string;
    automation_triggered: boolean;
  }> {
    if (USE_MOCK) {
      const { mockBeneficiaries } = await import("@/lib/mock/data");
      const beneficiary = mockBeneficiaries.find((b) => b.code === payload.beneficiary_id);
      if (beneficiary) {
        return {
          beneficiary_id: beneficiary.code,
          risk_score: beneficiary.riskScore,
          risk_tier: beneficiary.riskTier.toUpperCase(),
          drivers: beneficiary.riskDrivers,
          recommended_action: beneficiary.recommendedAction,
          automation_triggered: beneficiary.riskScore > 0.75,
        };
      }
      return {
        beneficiary_id: payload.beneficiary_id,
        risk_score: 0.5,
        risk_tier: "MEDIUM",
        drivers: ["Mock evaluation"],
        recommended_action: "Monitor",
        automation_triggered: false,
      };
    }
    return fetchApi("/api/v1/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getTelemetryStream(): Promise<ReadableStream> {
    if (USE_MOCK) {
      throw new Error("Mock mode - use SSE hook instead");
    }
    const response = await fetch(`${API_BASE}/api/v1/telemetry/stream`);
    if (!response.body) throw new Error("No stream body");
    return response.body;
  },

  async getTelemetryEvents(limit = 100): Promise<TelemetryEvent[]> {
    if (USE_MOCK) {
      const { mockTelemetryEvents } = await import("@/lib/mock/data");
      return mockTelemetryEvents.slice(0, limit);
    }
    return fetchApi(`/api/v1/telemetry/events?limit=${limit}`);
  },

  async getRiskDistribution(): Promise<RiskDistribution> {
    if (USE_MOCK) {
      const { mockRiskDistribution } = await import("@/lib/mock/data");
      return mockRiskDistribution;
    }
    return fetchApi("/api/v1/risk/distribution");
  },

  async getRiskTrend(range: "24h" | "7d" | "30d" = "7d"): Promise<RiskTrendPoint[]> {
    if (USE_MOCK) {
      const { mockRiskTrend } = await import("@/lib/mock/data");
      const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
      return mockRiskTrend.slice(-days);
    }
    return fetchApi(`/api/v1/risk/trend?range=${range}`);
  },

  async getDemandForecast(region?: string, days = 7): Promise<DemandForecast> {
    if (USE_MOCK) {
      const { mockDemandForecast, mockRegionalForecasts } = await import("@/lib/mock/data");
      if (region && region !== "national" && mockRegionalForecasts[region]) {
        return mockRegionalForecasts[region];
      }
      return mockDemandForecast;
    }
    const params = new URLSearchParams();
    if (region) params.append("region", region);
    params.append("days", String(days));
    return fetchApi(`/api/v1/demand?${params.toString()}`);
  },

  async getAlerts(filters?: { severity?: string; status?: string; region?: string; limit?: number }): Promise<Alert[]> {
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
        filtered = filtered.filter((a) => a.location.includes(filters.region!));
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
    return fetchApi(`/api/v1/alerts?${params.toString()}`);
  },

  async acknowledgeAlert(id: string): Promise<Alert> {
    if (USE_MOCK) {
      const { mockAlerts } = await import("@/lib/mock/data");
      const alert = mockAlerts.find((a) => a.id === id);
      if (alert) {
        alert.status = "acknowledged";
        alert.acknowledgedAt = new Date().toISOString();
        return alert;
      }
      throw new Error("Alert not found");
    }
    return fetchApi(`/api/v1/alerts/${id}/acknowledge`, { method: "POST" });
  },

  async resolveAlert(id: string): Promise<Alert> {
    if (USE_MOCK) {
      const { mockAlerts } = await import("@/lib/mock/data");
      const alert = mockAlerts.find((a) => a.id === id);
      if (alert) {
        alert.status = "resolved";
        alert.resolvedAt = new Date().toISOString();
        return alert;
      }
      throw new Error("Alert not found");
    }
    return fetchApi(`/api/v1/alerts/${id}/resolve`, { method: "POST" });
  },

  async getKPIMetrics(): Promise<KPIMetric[]> {
    if (USE_MOCK) {
      const { mockKPIMetrics } = await import("@/lib/mock/data");
      return mockKPIMetrics;
    }
    return fetchApi("/api/v1/metrics/kpi");
  },

  async getSystemStatus(): Promise<SystemStatus> {
    if (USE_MOCK) {
      const { mockSystemStatus } = await import("@/lib/mock/data");
      return mockSystemStatus;
    }
    return fetchApi("/api/v1/system/status");
  },

  async getMapRegions(): Promise<MapRegion[]> {
    if (USE_MOCK) {
      const { mockMapRegions } = await import("@/lib/mock/data");
      return mockMapRegions;
    }
    return fetchApi("/api/v1/map/regions");
  },

  async getFieldWorkers(): Promise<FieldWorker[]> {
    if (USE_MOCK) {
      const { mockFieldWorkers } = await import("@/lib/mock/data");
      return mockFieldWorkers;
    }
    return fetchApi("/api/v1/field-workers");
  },

  async syncOfflineData(payload: unknown): Promise<{ synced: number; failed: number }> {
    if (USE_MOCK) {
      return { synced: 1, failed: 0 };
    }
    return fetchApi("/api/offline-sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};