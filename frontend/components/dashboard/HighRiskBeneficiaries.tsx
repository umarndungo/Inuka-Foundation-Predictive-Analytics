"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Beneficiary } from "@/types";
import { formatRiskScore, getRiskTierLabel } from "@/lib/utils";

interface HighRiskBeneficiariesProps {
  beneficiaries: Beneficiary[];
  className?: string;
}

export function HighRiskBeneficiaries({ beneficiaries, className }: HighRiskBeneficiariesProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Beneficiary; direction: "asc" | "desc" }>({
    key: "riskScore",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  const pageSize = 10;
  const regions = useMemo(() => [...new Set(beneficiaries.map((b) => b.region))].sort(), [beneficiaries]);

  const filteredAndSorted = useMemo(() => {
    let result = [...beneficiaries];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.code.toLowerCase().includes(s) ||
          b.name.toLowerCase().includes(s) ||
          b.region.toLowerCase().includes(s) ||
          b.subCounty.toLowerCase().includes(s)
      );
    }

    if (riskFilter !== "all") {
      result = result.filter((b) => b.riskTier === riskFilter);
    }

    if (regionFilter !== "all") {
      result = result.filter((b) => b.region === regionFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [beneficiaries, search, riskFilter, regionFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedData = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Beneficiary) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportCSV = () => {
    const headers = "Code,Name,Region,SubCounty,RiskScore,RiskTier,Trend,LastActivity\n";
    const rows = filteredAndSorted
      .map((b) => `"${b.code}","${b.name}","${b.region}","${b.subCounty}",${b.riskScore},"${b.riskTier}","${b.trend}","${b.lastActivity}"`)
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beneficiaries_risk_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Beneficiary }) => {
    if (sortConfig.key !== columnKey) return <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-40" />;
    return sortConfig.direction === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-foreground font-bold" /> : <ChevronDown className="w-3.5 h-3.5 text-foreground font-bold" />;
  };

  return (
    <Card className={cn("h-full overflow-hidden border-none shadow-none rounded-md bg-card flex flex-col justify-between", className)}>
      {/* Table Header Toolbar */}
      <CardHeader className="p-4 sm:px-6 border-b border-border/40 bg-secondary/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-mono uppercase tracking-wider text-foreground">
              <AlertTriangle className="w-4 h-4 text-primary" />
              High-Risk Beneficiary Directory
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Live dropout risk scores, ML driver signals, and targeted field action dispatch.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search code, name, region..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-xs rounded-md bg-background border-border/60"
                aria-label="Search beneficiaries"
              />
            </div>

            <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v as any); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-32 rounded-md bg-background border-border/60">
                <SelectValue placeholder="All Risk" />
              </SelectTrigger>
              <SelectContent className="rounded-md shadow-none border border-border">
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical Tier</SelectItem>
                <SelectItem value="high">High Tier</SelectItem>
                <SelectItem value="medium">Medium Tier</SelectItem>
                <SelectItem value="low">Low Tier</SelectItem>
              </SelectContent>
            </Select>

            <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v ?? "all"); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-md bg-background border-border/60">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent className="rounded-md shadow-none border border-border">
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1.5 text-xs rounded-md border-border/60 hover:bg-secondary">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40 text-[11px] border-b border-border/40">
                <TableHead className="w-12 text-center py-3"></TableHead>
                <TableHead className="cursor-pointer select-none font-semibold text-muted-foreground uppercase tracking-wider py-3" onClick={() => handleSort("code")}>
                  <div className="flex items-center gap-1 font-mono">
                    Beneficiary Code <SortIcon columnKey="code" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold text-muted-foreground uppercase tracking-wider py-3" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1 font-mono">
                    Name <SortIcon columnKey="name" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold text-muted-foreground uppercase tracking-wider py-3" onClick={() => handleSort("region")}>
                  <div className="flex items-center gap-1 font-mono">
                    Location <SortIcon columnKey="region" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold text-muted-foreground uppercase tracking-wider py-3" onClick={() => handleSort("riskScore")}>
                  <div className="flex items-center gap-1 font-mono">
                    Risk Score <SortIcon columnKey="riskScore" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground uppercase tracking-wider py-3 font-mono">
                  Tier & Status
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground uppercase tracking-wider py-3 font-mono">
                  Top Risk Driver
                </TableHead>
                <TableHead className="w-20 text-right pr-6 py-3 font-mono">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/40 text-xs">
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-mono">
                    No beneficiaries match the selected query or filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((b) => (
                  <TableRow
                    key={b.id}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedBeneficiary(b)}
                  >
                    <TableCell className="text-center font-mono text-muted-foreground py-3">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded hover:bg-secondary">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>

                    <TableCell className="font-mono font-semibold text-foreground py-3">
                      {b.code}
                    </TableCell>

                    <TableCell className="font-medium text-foreground py-3">
                      {b.name}
                    </TableCell>

                    <TableCell className="text-muted-foreground font-sans py-3">
                      {b.region} <span className="text-[11px] text-muted-foreground/70">({b.subCounty})</span>
                    </TableCell>

                    <TableCell className="font-mono font-bold py-3 tabular-nums">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          b.riskScore >= 0.75 ? "text-primary font-bold" : "text-foreground font-semibold"
                        )}>
                          {(b.riskScore * 100).toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-14 bg-secondary rounded overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded",
                              b.riskScore >= 0.75 ? "bg-primary" : "bg-zinc-400"
                            )}
                            style={{ width: `${b.riskScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <StatusBadge
                        status={b.riskTier}
                        label={getRiskTierLabel(b.riskTier as any)}
                        size="sm"
                        showDot={b.riskTier === "critical" || b.riskTier === "high"}
                      />
                    </TableCell>

                    <TableCell className="text-muted-foreground font-mono text-[11px] py-3">
                      {b.riskDrivers[0] || "General Dip"}
                    </TableCell>

                    <TableCell className="text-right pr-6 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text.5 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBeneficiary(b);
                        }}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Table Footer & Pagination */}
      <div className="p-4 sm:px-6 border-t border-border/40 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground font-mono">
        <div>
          Showing <strong className="text-foreground">{Math.min((page - 1) * pageSize + 1, filteredAndSorted.length)}</strong> to <strong className="text-foreground">{Math.min(page * pageSize, filteredAndSorted.length)}</strong> of <strong className="text-foreground">{filteredAndSorted.length}</strong> records
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-7 px-2.5 text-xs rounded border-border/60"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </Button>

          <span className="text-xs px-2">Page {page} of {totalPages}</span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-7 px-2.5 text-xs rounded border-border/60"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedBeneficiary && (
        <Dialog open={!!selectedBeneficiary} onOpenChange={() => setSelectedBeneficiary(null)}>
          <DialogContent className="max-w-lg rounded-md border border-border shadow-none p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold font-mono">
                  {selectedBeneficiary.code} • {selectedBeneficiary.name}
                </DialogTitle>
                <StatusBadge status={selectedBeneficiary.riskTier} size="sm" showDot />
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Detailed dropout evaluation and field intervention guide.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded bg-secondary/50 font-mono text-xs border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Region</span>
                  <span className="font-semibold text-foreground">{selectedBeneficiary.region}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sub-County</span>
                  <span className="font-semibold text-foreground">{selectedBeneficiary.subCounty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">ML Dropout Score</span>
                  <span className="font-bold text-primary">{(selectedBeneficiary.riskScore * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Last Activity</span>
                  <span className="font-semibold text-foreground">{selectedBeneficiary.lastActivity}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-foreground block mb-2 font-mono">Identified Risk Drivers:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBeneficiary.riskDrivers.map((driver, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-secondary text-foreground text-xs font-mono border border-border/60">
                      {driver}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded bg-primary/10 border border-primary/20 text-xs space-y-1">
                <span className="font-semibold text-primary block">Recommended Action:</span>
                <p className="text-foreground leading-relaxed">
                  Dispatch Field Officer to conduct home visit in {selectedBeneficiary.region} within 48 hours.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
