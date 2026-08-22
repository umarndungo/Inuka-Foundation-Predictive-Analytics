"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Calculator, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { evaluateRisk } from "@/lib/api/risk";
import type { EvaluateResponse } from "@/types";

export function RiskEvaluatorCard() {
  const [beneficiaryId, setBeneficiaryId] = useState("B-9021");
  const [region, setRegion] = useState("Kisumu");
  const [attendanceRate, setAttendanceRate] = useState(0.58);
  const [assignmentCompletion, setAssignmentCompletion] = useState(0.42);
  const [travelDistance, setTravelDistance] = useState(14.5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await evaluateRisk({
        beneficiary_id: beneficiaryId,
        attendance_rate: attendanceRate,
        assignment_completion: assignmentCompletion,
        travel_distance_km: travelDistance,
        region,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full border-none shadow-none rounded-md bg-card overflow-hidden">
      <CardHeader className="p-3.5 border-b border-border/40 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-mono uppercase tracking-wider">
              <Calculator className="h-4 w-4 text-primary" />
              Interactive Risk Score Evaluator
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time scoring simulation connected to the XGBoost predictive pipeline.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono rounded px-2 py-0.5 bg-primary/10 border-primary/20 text-primary">
            POST /api/v1/evaluate
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleEvaluate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Beneficiary ID</label>
              <Input
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="h-8 text-xs font-mono rounded bg-background border-border/60"
                placeholder="e.g. B-9021"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Region</label>
              <Select value={region} onValueChange={(val) => val && setRegion(val)}>
                <SelectTrigger className="h-8 text-xs rounded bg-background border-border/60">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="rounded border border-border shadow-none">
                  <SelectItem value="Nairobi">Nairobi</SelectItem>
                  <SelectItem value="Kisumu">Kisumu</SelectItem>
                  <SelectItem value="Nakuru">Nakuru</SelectItem>
                  <SelectItem value="Mombasa">Mombasa</SelectItem>
                  <SelectItem value="Eldoret">Eldoret</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded bg-secondary/40 border border-border/40">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Attendance</span>
                <span className="font-mono font-bold text-foreground">{(attendanceRate * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={attendanceRate}
                onChange={(e) => setAttendanceRate(parseFloat(e.target.value))}
                className="w-full accent-primary h-1 rounded bg-muted cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Completion</span>
                <span className="font-mono font-bold text-foreground">{(assignmentCompletion * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={assignmentCompletion}
                onChange={(e) => setAssignmentCompletion(parseFloat(e.target.value))}
                className="w-full accent-primary h-1 rounded bg-muted cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Distance</span>
                <span className="font-mono font-bold text-foreground">{travelDistance} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={travelDistance}
                onChange={(e) => setTravelDistance(parseFloat(e.target.value))}
                className="w-full accent-primary h-1 rounded bg-muted cursor-pointer"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} size="sm" className="w-full h-8 gap-1.5 font-semibold text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 shadow-none cursor-pointer">
            <Zap className="h-4 w-4" />
            {loading ? "Calculating..." : "Run Evaluation Simulation"}
          </Button>
        </form>

        {result && (
          <div className="p-3.5 rounded border border-border/40 bg-secondary/30 space-y-3 shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-foreground">{result.beneficiary_id} Score Result</span>
              <StatusBadge
                status={result.risk_tier.toLowerCase()}
                label={`${result.risk_tier} RISK`}
                showDot={result.risk_tier === "HIGH"}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-sans text-foreground tracking-tight">
                {(result.risk_score * 100).toFixed(1)}%
              </span>
              <div className="flex-1">
                <div className="h-1.5 w-full bg-secondary rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${result.risk_score * 100}%`,
                      backgroundColor:
                        result.risk_tier === "HIGH"
                          ? "var(--primary)"
                          : "var(--risk-low)",
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Dropout Probability</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono font-semibold text-muted-foreground mb-1">Risk Factors:</p>
              <div className="flex flex-wrap gap-1">
                {result.drivers.map((d, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-secondary text-foreground text-[11px] font-mono border border-border/60">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded bg-secondary/50 text-xs flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Action:</span>
              <span className="font-semibold text-foreground">{result.recommended_action}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground font-mono">Automation Trigger:</span>
              {result.automation_triggered ? (
                <span className="text-primary font-mono font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> SMS Triggered (&gt;0.75)
                </span>
              ) : (
                <span className="text-muted-foreground font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" /> Normal Threshold
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
