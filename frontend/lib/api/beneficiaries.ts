import type { Beneficiary, FilterState, PaginatedResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

async function getMockBeneficiaries(filters?: Partial<FilterState>): Promise<PaginatedResponse<Beneficiary>> {
  const { mockBeneficiaries } = await import("@/lib/mock/data");
  let filtered = [...mockBeneficiaries];

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.code.toLowerCase().includes(search) ||
        b.name.toLowerCase().includes(search) ||
        b.region.toLowerCase().includes(search) ||
        b.subCounty.toLowerCase().includes(search)
    );
  }
  if (filters?.region && filters.region !== "all") {
    filtered = filtered.filter((b) => b.region.toLowerCase() === filters.region!.toLowerCase());
  }
  if (filters?.riskTier && filters.riskTier !== "all") {
    filtered = filtered.filter((b) => b.riskTier.toLowerCase() === filters.riskTier!.toLowerCase());
  }

  if (filters?.sortBy) {
    const key = filters.sortBy as keyof Beneficiary;
    const order = filters.sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const aVal = a[key] ?? "";
      const bVal = b[key] ?? "";
      if (aVal < bVal) return -order;
      if (aVal > bVal) return order;
      return 0;
    });
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
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

export async function getBeneficiaries(filters?: Partial<FilterState>): Promise<PaginatedResponse<Beneficiary>> {
  if (USE_MOCK) {
    return getMockBeneficiaries(filters);
  }

  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/beneficiaries?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch beneficiaries");
    return res.json();
  } catch {
    return getMockBeneficiaries(filters);
  }
}

export async function getBeneficiary(id: string): Promise<Beneficiary> {
  const getMock = async () => {
    const { mockBeneficiaries } = await import("@/lib/mock/data");
    const beneficiary = mockBeneficiaries.find((b) => b.id === id || b.code === id);
    if (!beneficiary) throw new Error("Beneficiary not found");
    return beneficiary;
  };

  if (USE_MOCK) {
    return getMock();
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/beneficiaries/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch beneficiary detail");
    return res.json();
  } catch {
    return getMock();
  }
}
