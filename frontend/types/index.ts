export interface Beneficiary {
  id: string;
  code: string;
  name: string;
  region: string;
  subCounty: string;
  school: string;
  grade: number;
  age: number;
  gender: "M" | "F";
  riskScore: number;
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  riskDrivers: string[];
  recommendedAction: string;
  lastActivity: string;
  attendanceRate: number;
  assignmentCompletion: number;
  travelDistanceKm: number;
  phoneNumber?: string;
  fieldWorkerId?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  trend: "improving" | "stable" | "declining";
  enrollmentDate: string;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  eventType: "attendance" | "engagement" | "location" | "device_health" | "assignment";
  deviceId: string;
  region: string;
  value: number;
  metadata?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  total: number;
}

export interface RiskTrendPoint {
  date: string;
  overall: number;
  high: number;
  low: number;
  medium: number;
}

export interface DemandForecast {
  region: string;
  historical: number[];
  predicted: number[];
  confidence: number[];
  dates: string[];
  summary: {
    expectedChange: number;
    peakDay: string;
    confidence: number;
  };
}

export interface Alert {
  id: string;
  type: "critical_risk" | "high_risk" | "telemetry_anomaly" | "ingestion_failure" | "offline_device" | "forecast_anomaly";
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "acknowledged" | "resolved";
  timestamp: string;
  location: string;
  beneficiaryId?: string;
  beneficiaryCode?: string;
  deviceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
  icon: string;
  status?: "normal" | "warning" | "critical" | "positive";
  isInverse?: boolean;
}

export interface SystemStatus {
  isOnline: boolean;
  lastSync: string | null;
  syncStatus: "synced" | "syncing" | "offline" | "error";
  devicesOnline: number;
  devicesTotal: number;
  ingestionRate: number;
  apiLatency: number;
}

export interface MapRegion {
  name: string;
  code: string;
  coordinates: [number, number];
  beneficiaries: number;
  highRisk: number;
  riskScore: number;
}

export interface FieldWorker {
  id: string;
  code: string;
  name: string;
  region: string;
  phoneNumber: string;
  assignedBeneficiaries: number;
  lastSync: string;
  isOnline: boolean;
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterState {
  search: string;
  region: string;
  riskTier: string;
  dateRange: { from: Date | null; to: Date | null };
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface OfflineQueueItem {
  id: string;
  type: "beneficiary_update" | "field_note" | "attendance_log" | "assessment";
  payload: unknown;
  timestamp: string;
  retries: number;
  status: "pending" | "syncing" | "synced" | "failed";
}

// API Contracts per docs/00_end_to_end_integration.md
export interface EvaluateRequest {
  beneficiary_id: string;
  attendance_rate: number;
  assignment_completion: number;
  travel_distance_km: number;
  region: string;
}

export interface EvaluateResponse {
  beneficiary_id: string;
  risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  drivers: string[];
  recommended_action: string;
  automation_triggered: boolean;
}

export interface RegionalDemandForecast {
  region: string;
  predicted_demand: number;
  historical_trend: number[];
  risk_factor: number;
  dates: string[];
  summary: {
    expectedChange: number;
    peakDay: string;
    confidence: number;
  };
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  type: "info";
  bullets?: string[];
}