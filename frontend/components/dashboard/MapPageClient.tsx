"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldMap } from "./FieldMap";
import { MapFeedPanel } from "./MapFeedPanel";
import { BeneficiaryDetailPanel } from "./BeneficiaryDetailPanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Beneficiary, FieldWorker, MapRegion } from "@/types";

interface MapPageClientProps {
  mapRegions: MapRegion[];
  fieldWorkers: FieldWorker[];
  beneficiaries: Beneficiary[];
}

export function MapPageClient({ mapRegions, fieldWorkers, beneficiaries }: MapPageClientProps) {
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
  const activeWorkers = fieldWorkers.filter((w) => w.isOnline);

  const handleBeneficiarySelect = useCallback((b: Beneficiary | null) => {
    setSelectedBeneficiaryId(b?.id ?? null);
  }, []);

  const selectedBeneficiary = selectedBeneficiaryId
    ? beneficiaries.find((b) => b.id === selectedBeneficiaryId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Geographic Intelligence & Spatial Operations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive map — regional risk clusters, active field agents, and beneficiary detail panels.
          </p>
        </div>
        <StatusBadge status="synced" label={`${activeWorkers.length} Agents Online`} size="sm" />
      </div>

      {/* Three-panel layout */}
      <div className="flex gap-0 border border-border/60 rounded-xl overflow-hidden bg-card" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
        {/* Left: Feed */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 border-r border-border/60 flex-shrink-0">
          <MapFeedPanel
            beneficiaries={beneficiaries}
            selectedId={selectedBeneficiaryId}
            onSelect={handleBeneficiarySelect}
          />
        </div>

        {/* Center: Map */}
        <div className="flex-1 min-w-0">
          <FieldMap
            mapRegions={mapRegions}
            fieldWorkers={fieldWorkers}
            beneficiaries={beneficiaries}
            compact
            selectedBeneficiaryId={selectedBeneficiaryId}
            onBeneficiarySelect={handleBeneficiarySelect}
          />
        </div>

        {/* Right: Detail panel */}
        {selectedBeneficiary && (
          <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-border/60 flex-shrink-0">
            <BeneficiaryDetailPanel
              beneficiary={selectedBeneficiary}
              onClose={() => setSelectedBeneficiaryId(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile: Beneficiary cards below map */}
      <div className="lg:hidden space-y-3">
        {selectedBeneficiary ? (
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <BeneficiaryDetailPanel
              beneficiary={selectedBeneficiary}
              onClose={() => setSelectedBeneficiaryId(null)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {beneficiaries.filter((b) => b.riskTier === "HIGH").slice(0, 6).map((b) => (
              <button
                key={b.id}
                onClick={() => handleBeneficiarySelect(b)}
                className="text-left p-2.5 rounded-lg bg-card border border-border/60 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-xs font-mono font-semibold text-foreground truncate">{b.code}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{b.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Field Workers roster */}
      <Card className="border border-border/60 shadow-none rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-4 border-b border-border/40 bg-secondary/20">
          <CardTitle className="text-sm font-semibold">Active Field Agent Roster</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {fieldWorkers.map((worker) => (
            <div key={worker.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-xs">
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback className="bg-secondary text-foreground font-mono font-semibold text-[10px]">
                  {worker.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground font-mono truncate">{worker.name}</p>
                <p className="text-muted-foreground text-[10px] font-mono">{worker.region} · {worker.assignedBeneficiaries} assigned</p>
              </div>
              <StatusBadge status={worker.isOnline ? "online" : "offline"} size="sm" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
