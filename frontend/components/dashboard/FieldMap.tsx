"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Map, NavigationControl, ScaleControl, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, AlertTriangle, User, X, ChevronDown, ChevronUp, Layers, Search } from "lucide-react";
import type { MapRegion, Beneficiary, FieldWorker } from "@/types";
import { mockMapRegions, mockBeneficiaries, mockFieldWorkers } from "@/lib/mock/data";
import { getRiskTier } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [36.8219, -1.2921];
const DEFAULT_ZOOM = 5.5;

const getRiskColor = (tier: string) => `var(--risk-${tier})`;

interface FieldMapProps {
  className?: string;
}

export function FieldMap({ className }: FieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<MapRegion | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showBeneficiaries, setShowBeneficiaries] = useState(true);
  const [showFieldWorkers, setShowFieldWorkers] = useState(false);
  const [showRiskHeatmap, setShowRiskHeatmap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initializeMap = useCallback(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      setMapLoaded(true);

      mockMapRegions.forEach((region) => {
        const el = document.createElement("div");
        el.className = "region-marker";
        const riskColor = getRiskColor(getRiskTier(region.riskScore));
        el.innerHTML = `
          <div style="
            width: 40px; height: 40px; border-radius: 50%;
            background: ${riskColor};
            border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 12px; color: white;
            cursor: pointer; transition: transform 0.2s;
          " title="${region.name}: ${region.beneficiaries} beneficiaries">
            ${region.highRisk}
          </div>
        `;

        new Marker({ element: el, anchor: "center" })
          .setLngLat(region.coordinates)
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedRegion(region);
          setSelectedBeneficiary(null);
        });
      });

      if (showBeneficiaries) {
        addBeneficiaryMarkers(map);
      }
    });

    mapRef.current = map;
  }, [showBeneficiaries]);

  const addBeneficiaryMarkers = (map: Map) => {
    const highRiskBeneficiaries = mockBeneficiaries.filter((b) => b.riskTier === "high" || b.riskTier === "critical");

    highRiskBeneficiaries.forEach((beneficiary) => {
      const el = document.createElement("div");
      const tier = beneficiary.riskTier;
      const color = getRiskColor(tier);
      el.innerHTML = `
        <div style="
          width: 16px; height: 16px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3); cursor: pointer;
          transition: transform 0.15s;
        " title="${beneficiary.code}: ${beneficiary.riskTier.toUpperCase()} (${beneficiary.riskScore})"></div>
      `;

      new Marker({ element: el, anchor: "center" })
        .setLngLat([beneficiary.coordinates.lng, beneficiary.coordinates.lat])
        .addTo(map);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedBeneficiary(beneficiary);
        setSelectedRegion(null);
      });
    });
  };

  const addFieldWorkerMarkers = (map: Map) => {
    mockFieldWorkers.filter((fw) => fw.isOnline).forEach((worker) => {
      const region = mockMapRegions.find((r) => r.name === worker.region);
      if (!region) return;

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width: 24px; height: 24px; border-radius: 50%;
          background: #3b82f6; border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        " title="${worker.name} (${worker.assignedBeneficiaries} beneficiaries)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      `;

      new Marker({ element: el, anchor: "center" })
        .setLngLat(region.coordinates)
        .addTo(map);
    });
  };

  useEffect(() => {
    initializeMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [initializeMap]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    try {
      if (map.getSource("beneficiaries")) map.removeSource("beneficiaries");
    } catch {}
    try {
      if (map.getLayer("beneficiaries")) map.removeLayer("beneficiaries");
    } catch {}

    if (showBeneficiaries) {
      addBeneficiaryMarkers(map);
    }
  }, [showBeneficiaries, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    try {
      if (map.getSource("field-workers")) map.removeSource("field-workers");
    } catch {}
    try {
      if (map.getLayer("field-workers")) map.removeLayer("field-workers");
    } catch {}

    if (showFieldWorkers) {
      addFieldWorkerMarkers(map);
    }
  }, [showFieldWorkers, mapLoaded]);

  const flyToRegion = (region: MapRegion) => {
    mapRef.current?.flyTo({ center: region.coordinates, zoom: 8, essential: true });
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Field Map</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showBeneficiaries}
                onChange={(e) => setShowBeneficiaries(e.target.checked)}
                className="rounded border-input"
              />
              High-risk beneficiaries
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showFieldWorkers}
                onChange={(e) => setShowFieldWorkers(e.target.checked)}
                className="rounded border-input"
              />
              Field workers
            </label>
            <Button variant="outline" size="sm" className="gap-1">
              <Layers className="w-3.5 h-3.5" />
              Layers
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p>Loading map...</p>
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <Button variant="default" size="icon" className="shadow-lg" onClick={() => mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })} aria-label="Reset view">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>

        {(selectedRegion || selectedBeneficiary) && (
          <div className="absolute bottom-3 left-3 right-3 lg:right-auto lg:w-80 z-10 max-h-[60vh]">
            <Card className="shadow-xl">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    {selectedRegion && (
                      <>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold">{selectedRegion.name} Region</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{selectedRegion.beneficiaries} beneficiaries • {selectedRegion.highRisk} high-risk</p>
                      </>
                    )}
                    {selectedBeneficiary && (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("bg-[var(--risk-" + selectedBeneficiary.riskTier + ")]/10 text-[var(--risk-" + selectedBeneficiary.riskTier + ")]", "gap-1")}>
                            <AlertTriangle className="w-3 h-3" />
                            {selectedBeneficiary.riskTier.toUpperCase()}
                          </Badge>
                          <span className="font-mono font-bold">{selectedBeneficiary.riskScore}</span>
                        </div>
                        <p className="text-sm font-medium">{selectedBeneficiary.code} • {selectedBeneficiary.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedBeneficiary.region}, {selectedBeneficiary.subCounty}</p>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedRegion(null); setSelectedBeneficiary(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {selectedRegion && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Beneficiaries</span><span className="font-medium">{selectedRegion.beneficiaries}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">High Risk</span><span className="font-medium text-[var(--risk-high)]">{selectedRegion.highRisk}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Risk Score</span><span className="font-medium">{selectedRegion.riskScore.toFixed(2)}</span></div>
                    <Button className="w-full mt-2" size="sm" onClick={() => flyToRegion(selectedRegion)}>
                      Focus on Region
                    </Button>
                  </div>
                )}

                {selectedBeneficiary && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Attendance</span><span className="font-medium">{(selectedBeneficiary.attendanceRate * 100).toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Assignments</span><span className="font-medium">{(selectedBeneficiary.assignmentCompletion * 100).toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Travel Distance</span><span className="font-medium">{selectedBeneficiary.travelDistanceKm} km</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last Active</span><span className="font-medium">{new Date(selectedBeneficiary.lastActivity).toLocaleString()}</span></div>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground"><strong>Drivers:</strong> {selectedBeneficiary.riskDrivers.join(", ")}</p>
                    <p className="text-xs text-muted-foreground"><strong>Action:</strong> {selectedBeneficiary.recommendedAction}</p>
                    <Button className="w-full mt-2" size="sm" variant="default">
                      Contact Field Worker
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-background/90 backdrop-blur rounded-lg border p-2 text-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--risk-critical)" }} />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--risk-high)" }} />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--risk-medium)" }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--risk-low)" }} />
              <span>Low</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}