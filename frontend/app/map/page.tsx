import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MapPageClient } from "@/components/dashboard/MapPageClient";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [mapRegions, fieldWorkers, beneficiariesResult] = await Promise.all([
    api.getMapRegions(),
    api.getFieldWorkers(),
    api.getBeneficiaries({ pageSize: 500 }).catch(() => null),
  ]);

  const beneficiaries = beneficiariesResult?.items ?? [];

  return (
    <DashboardLayout>
      <MapPageClient
        mapRegions={mapRegions}
        fieldWorkers={fieldWorkers}
        beneficiaries={beneficiaries}
      />
    </DashboardLayout>
  );
}
