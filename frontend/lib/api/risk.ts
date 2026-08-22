import type { EvaluateRequest, EvaluateResponse, RiskDistribution, RiskTrendPoint } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export async function evaluateRisk(payload: EvaluateRequest): Promise<EvaluateResponse> {
  if (USE_MOCK) {
    const { mockBeneficiaries } = await import("@/lib/mock/data");
    const beneficiary = mockBeneficiaries.find((b) => b.code === payload.beneficiary_id || b.id === payload.beneficiary_id);
    
    if (beneficiary) {
      const riskScore = beneficiary.riskScore;
      const riskTier = riskScore > 0.75 ? "HIGH" : riskScore > 0.4 ? "MEDIUM" : "LOW";
      return {
        beneficiary_id: beneficiary.code,
        risk_score: riskScore,
        risk_tier: riskTier,
        drivers: beneficiary.riskDrivers,
        recommended_action: beneficiary.recommendedAction,
        automation_triggered: riskScore > 0.75,
      };
    }

    // Dynamic calculation fallback based on indicators
    const score = Math.min(
      1.0,
      Math.max(
        0.05,
        (1 - payload.attendance_rate) * 0.45 +
          (1 - payload.assignment_completion) * 0.35 +
          (payload.travel_distance_km / 20) * 0.2
      )
    );
    const tier = score > 0.75 ? "HIGH" : score > 0.4 ? "MEDIUM" : "LOW";
    const drivers: string[] = [];
    if (payload.attendance_rate < 0.6) drivers.push("Low Attendance Rate");
    if (payload.assignment_completion < 0.5) drivers.push("Low Assignment Completion");
    if (payload.travel_distance_km > 10) drivers.push("High Travel Distance");
    if (drivers.length === 0) drivers.push("Stable Performance");

    return {
      beneficiary_id: payload.beneficiary_id,
      risk_score: Number(score.toFixed(2)),
      risk_tier: tier,
      drivers,
      recommended_action:
        score > 0.75
          ? "Automated Field Worker Outreach & Urgent Home Visit"
          : score > 0.4
          ? "Bi-weekly Mentorship Check-in"
          : "Standard Program Tracking",
      automation_triggered: score > 0.75,
    };
  }

  const res = await fetch(`${API_BASE}/api/v1/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Evaluation failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getRiskDistribution(): Promise<RiskDistribution> {
  if (USE_MOCK) {
    const { mockRiskDistribution } = await import("@/lib/mock/data");
    return mockRiskDistribution;
  }

  const res = await fetch(`${API_BASE}/api/v1/risk/distribution`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch risk distribution");
  return res.json();
}

export async function getRiskTrend(range: "24h" | "7d" | "30d" = "7d"): Promise<RiskTrendPoint[]> {
  if (USE_MOCK) {
    const { mockRiskTrend } = await import("@/lib/mock/data");
    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
    return mockRiskTrend.slice(-days);
  }

  const res = await fetch(`${API_BASE}/api/v1/risk/trend?period=${range}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch risk trend");
  return res.json();
}
