import type { Beneficiary, FilterState, PaginatedResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export async function getBeneficiaries(filters?: Partial<FilterState>): Promise<PaginatedResponse<Beneficiary>> {
  if (USE_MOCK) {
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

  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const res = await fetch(`${API_BASE}/api/v1/beneficiaries?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch beneficiaries");
  return res.json();
}

export async function getBeneficiary(id: string): Promise<Beneficiary> {
  if (USE_MOCK) {
    const { mockBeneficiaries } = await import("@/lib/mock/data");
    const beneficiary = mockBeneficiaries.find((b) => b.id === id || b.code === id);
    if (!beneficiary) throw new Error("Beneficiary not found");
    return beneficiary;
  }

  const res = await fetch(`${API_BASE}/api/v1/beneficiaries/${id}`);
  if (!res.ok) throw new Error("Failed to fetch beneficiary detail");
  return res.json();
}
