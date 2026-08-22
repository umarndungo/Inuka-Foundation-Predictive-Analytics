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
  PaginatedResponse,
  FilterState,
  EvaluateRequest,
  EvaluateResponse,
} from "@/types";
import { getBeneficiaries, getBeneficiary } from "./beneficiaries";
import { evaluateRisk, getRiskDistribution, getRiskTrend } from "./risk";
import { getDemandForecast, getRegionalDemandBreakdown } from "./demand";
import { getTelemetryEvents } from "./telemetry";
import { getAlerts, acknowledgeAlert, resolveAlert } from "./alerts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const api = {
  getBeneficiaries: (filters?: Partial<FilterState>): Promise<PaginatedResponse<Beneficiary>> =>
    getBeneficiaries(filters),

  getBeneficiary: (id: string): Promise<Beneficiary> => getBeneficiary(id),

  evaluateRisk: (payload: EvaluateRequest): Promise<EvaluateResponse> => evaluateRisk(payload),

  getTelemetryStream: async (): Promise<ReadableStream> => {
    if (USE_MOCK) {
      throw new Error("Mock mode - use EventSource SSE hook");
    }
    const response = await fetch(`${API_BASE}/api/v1/telemetry/stream`);
    if (!response.body) throw new Error("No stream body");
    return response.body;
  },

  getTelemetryEvents: (limit = 100): Promise<TelemetryEvent[]> => getTelemetryEvents(limit),

  getRiskDistribution: (): Promise<RiskDistribution> => getRiskDistribution(),

  getRiskTrend: (range: "24h" | "7d" | "30d" = "7d"): Promise<RiskTrendPoint[]> => getRiskTrend(range),

  getDemandForecast: (region?: string, days = 7): Promise<DemandForecast> =>
    getDemandForecast(region, days),

  getRegionalDemandBreakdown: (days = 30) => getRegionalDemandBreakdown(days),

  getAlerts: (filters?: { severity?: string; status?: string; region?: string; limit?: number }): Promise<Alert[]> =>
    getAlerts(filters),

  acknowledgeAlert: (id: string): Promise<Alert> => acknowledgeAlert(id),

  resolveAlert: (id: string): Promise<Alert> => resolveAlert(id),

  getKPIMetrics: async (): Promise<KPIMetric[]> => {
    if (USE_MOCK) {
      const { mockKPIMetrics } = await import("@/lib/mock/data");
      return mockKPIMetrics;
    }

    const res = await fetch(`${API_BASE}/api/v1/metrics/kpi`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch KPI metrics: HTTP ${res.status}`);
    }
    return res.json();
  },

  getSystemStatus: async (): Promise<SystemStatus> => {
    if (USE_MOCK) {
      const { mockSystemStatus } = await import("@/lib/mock/data");
      return mockSystemStatus;
    }

    const res = await fetch(`${API_BASE}/api/v1/system/status`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch system status: HTTP ${res.status}`);
    }
    return res.json();
  },

  getMapRegions: async (): Promise<MapRegion[]> => {
    if (USE_MOCK) {
      const { mockMapRegions } = await import("@/lib/mock/data");
      return mockMapRegions;
    }

    const res = await fetch(`${API_BASE}/api/v1/map/regions`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch map regions: HTTP ${res.status}`);
    }
    return res.json();
  },

  getFieldWorkers: async (): Promise<FieldWorker[]> => {
    if (USE_MOCK) {
      const { mockFieldWorkers } = await import("@/lib/mock/data");
      return mockFieldWorkers;
    }

    const res = await fetch(`${API_BASE}/api/v1/field-workers`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch field workers: HTTP ${res.status}`);
    }
    return res.json();
  },

  syncOfflineData: async (payload: unknown): Promise<{ synced: number; failed: number }> => {
    if (USE_MOCK) {
      return { synced: 1, failed: 0 };
    }
    const res = await fetch(`${API_BASE}/api/offline-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
  },
};