import type { DemandForecast, RegionalDemandForecast } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export async function getDemandForecast(region?: string, days = 7): Promise<DemandForecast> {
  if (USE_MOCK) {
    const { mockDemandForecast, mockRegionalForecasts } = await import("@/lib/mock/data");
    if (region && region.toLowerCase() !== "national" && mockRegionalForecasts[region]) {
      return mockRegionalForecasts[region];
    }
    return mockDemandForecast;
  }

  const params = new URLSearchParams();
  if (region) params.append("region", region);
  params.append("days", String(days));

  const res = await fetch(`${API_BASE}/api/v1/demand?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch demand forecast");
  return res.json();
}

export async function getRegionalDemandBreakdown(): Promise<RegionalDemandForecast[]> {
  if (USE_MOCK) {
    const { mockRegionalForecasts } = await import("@/lib/mock/data");
    return Object.values(mockRegionalForecasts).map((forecast) => ({
      region: forecast.region,
      predicted_demand: forecast.predicted[forecast.predicted.length - 1],
      historical_trend: forecast.historical,
      risk_factor: Number((forecast.summary.expectedChange / 100).toFixed(2)),
      dates: forecast.dates,
      summary: forecast.summary,
    }));
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/demand/breakdown`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch regional demand breakdown");
    return res.json();
  } catch {
    const { mockRegionalForecasts } = await import("@/lib/mock/data");
    return Object.values(mockRegionalForecasts).map((forecast) => ({
      region: forecast.region,
      predicted_demand: forecast.predicted[forecast.predicted.length - 1],
      historical_trend: forecast.historical,
      risk_factor: Number((forecast.summary.expectedChange / 100).toFixed(2)),
      dates: forecast.dates,
      summary: forecast.summary,
    }));
  }
}
