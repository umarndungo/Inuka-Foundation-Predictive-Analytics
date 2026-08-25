"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, X, Compass } from "lucide-react";
import type { Beneficiary, FieldWorker, MapRegion } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];
const DEFAULT_ZOOM = 7;

const getRiskColorHex = (tier: string) => {
  switch (tier) {
    case "HIGH":
      return "#DC2626";
    case "MEDIUM":
      return "#71717A";
    default:
      return "#52525B";
  }
};

function createIcon(html: string, size: number = 36): L.DivIcon {
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface FieldMapProps {
  className?: string;
  mapRegions: MapRegion[];
  beneficiaries: Beneficiary[];
  fieldWorkers: FieldWorker[];
}

export function FieldMap({ className, mapRegions, beneficiaries, fieldWorkers }: FieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<MapRegion | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showBeneficiaries, setShowBeneficiaries] = useState(true);
  const [showFieldWorkers, setShowFieldWorkers] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const initializeMap = useCallback(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    setMapError(null);
    setMapLoaded(false);

    try {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      map.whenReady(() => {
        setMapLoaded(true);

        mapRegions.forEach((region) => {
          const tier = region.riskScore >= 0.75 ? "HIGH" : region.riskScore >= 0.45 ? "MEDIUM" : "LOW";
          const riskColor = getRiskColorHex(tier);
          const icon = createIcon(`
            <div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: ${riskColor};
              border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              display: flex; align-items: center; justify-content: center;
              font-weight: 700; font-size: 11px; color: white;
              cursor: pointer; transition: transform 0.15s ease;
            " title="${region.name}: ${region.beneficiaries} enrolled, ${region.highRisk} high-risk">
              ${region.highRisk}
            </div>
          `);

          const marker = L.marker(region.coordinates as L.LatLngExpression, { icon })
            .addTo(map)
            .on("click", () => {
              setSelectedRegion(region);
              setSelectedBeneficiary(null);
            });
        });

        if (showBeneficiaries) {
          addBeneficiaryMarkers(map);
        }
        if (showFieldWorkers) {
          addFieldWorkerMarkers(map);
        }
      });

      mapRef.current = map;
    } catch {
      setMapError("Map initialization failed in the browser.");
      setMapLoaded(false);
    }
  }, [beneficiaries, mapRegions, showBeneficiaries, showFieldWorkers]);

  const addBeneficiaryMarkers = (map: L.Map) => {
    const highRiskBeneficiaries = beneficiaries.filter(
      (b) => b.riskTier === "HIGH"
    );

    highRiskBeneficiaries.forEach((b) => {
      const color = getRiskColorHex(b.riskTier);
      const icon = createIcon(`
        <div style="
          width: 12px; height: 12px; border-radius: 50%;
          background: ${color}; border: 1.5px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer;
        " title="${b.code}: ${b.riskTier} (${b.riskScore})"></div>
      `, 12);

      L.marker([b.coordinates.lat, b.coordinates.lng], { icon })
        .addTo(map)
        .on("click", () => {
          setSelectedBeneficiary(b);
          setSelectedRegion(null);
        });
    });
  };

  const addFieldWorkerMarkers = (map: L.Map) => {
    fieldWorkers.forEach((worker) => {
      const region = mapRegions.find((item) => item.name.toLowerCase() === worker.region.toLowerCase());
      if (!region) return;

      const icon = createIcon(`
        <div style="
          width: 16px; height: 16px; border-radius: 9999px;
          background: ${worker.isOnline ? "#16A34A" : "#71717A"};
          border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          cursor: pointer;
        " title="${worker.name} (${worker.region})"></div>
      `, 16);

      L.marker(region.coordinates as L.LatLngExpression, { icon }).addTo(map);
    });
  };

  useEffect(() => {
    initializeMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
      setMapError(null);
    };
  }, [initializeMap]);

  const flyToCenter = () => {
    mapRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM);
  };

  const flyToRegion = (region: MapRegion) => {
    mapRef.current?.flyTo(region.coordinates as L.LatLngExpression, 9);
  };

  return (
    <Card className={cn("h-full flex flex-col border border-border shadow-xs bg-card overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-foreground" />
              Geospatial Field Operations & Demand Map
            </CardTitle>
            <CardDescription className="text-xs">
              Interactive spatial view of regional risk clusters and active field agents.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={showBeneficiaries}
                onChange={(e) => setShowBeneficiaries(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              High-Risk Hotspots
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={showFieldWorkers}
                onChange={(e) => setShowFieldWorkers(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              Field Staff
            </label>
            <Button variant="outline" size="sm" onClick={flyToCenter} className="h-7 gap-1 text-xs">
              <Compass className="w-3.5 h-3.5" /> Reset View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative min-h-[380px]">
        <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-medium">Loading Map...</p>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10 p-6">
            <div className="max-w-md text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">Map unavailable</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{mapError}</p>
            </div>
          </div>
        )}

        {(selectedRegion || selectedBeneficiary) && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-20">
            <Card className="shadow-md border border-border bg-card">
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  {selectedRegion && (
                    <div>
                      <h4 className="font-semibold text-xs text-foreground">{selectedRegion.name} Region</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedRegion.beneficiaries} Enrolled • <strong className="text-destructive">{selectedRegion.highRisk} High-Risk</strong>
                      </p>
                    </div>
                  )}
                  {selectedBeneficiary && (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="destructive" className="text-[9px] uppercase font-semibold">
                          {selectedBeneficiary.riskTier}
                        </Badge>
                        <span className="font-mono font-bold text-xs">{selectedBeneficiary.riskScore}</span>
                      </div>
                      <p className="font-semibold text-xs text-foreground mt-0.5">{selectedBeneficiary.code} • {selectedBeneficiary.name}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedBeneficiary.region}, {selectedBeneficiary.subCounty}</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => { setSelectedRegion(null); setSelectedBeneficiary(null); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {selectedRegion && (
                  <Button size="sm" className="w-full h-7 text-xs font-medium" onClick={() => flyToRegion(selectedRegion)}>
                    Focus Region
                  </Button>
                )}

                {selectedBeneficiary && (
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded bg-muted/40 border border-border">
                      <div><span className="text-muted-foreground">Attendance:</span> <strong className="font-mono">{(selectedBeneficiary.attendanceRate * 100).toFixed(0)}%</strong></div>
                      <div><span className="text-muted-foreground">Completion:</span> <strong className="font-mono">{(selectedBeneficiary.assignmentCompletion * 100).toFixed(0)}%</strong></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground"><strong>Action:</strong> {selectedBeneficiary.recommendedAction}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="absolute top-3 left-3 z-10">
          <div className="bg-card/90 backdrop-blur-sm rounded-md border border-border p-2 shadow-xs text-[11px] space-y-1">
            <span className="font-mono font-medium text-muted-foreground block text-[10px] uppercase">Risk Tier Legend</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-zinc-700 dark:bg-zinc-400" />
              <span>Low Risk</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
