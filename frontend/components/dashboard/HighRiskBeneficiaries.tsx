"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Search, Filter, ChevronDown, ChevronUp, Download, Eye, AlertTriangle } from "lucide-react";
import type { Beneficiary } from "@/types";
import { formatRiskScore, getRiskTier, getRiskTierLabel } from "@/lib/utils";

interface HighRiskBeneficiariesProps {
  beneficiaries: Beneficiary[];
  className?: string;
}

const RISK_TIER_COLORS = {
  low: "bg-[var(--risk-low)]/10 text-[var(--risk-low)] border-[var(--risk-low)]/20",
  medium: "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)] border-[var(--risk-medium)]/20",
  high: "bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-[var(--risk-high)]/20",
  critical: "bg-[var(--risk-critical)]/10 text-[var(--risk-critical)] border-[var(--risk-critical)]/20",
};

export function HighRiskBeneficiaries({ beneficiaries, className }: HighRiskBeneficiariesProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Beneficiary; direction: "asc" | "desc" }>({ key: "riskScore", direction: "desc" });
  const [page, setPage] = useState(1);
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

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const paginatedData = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Beneficiary) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ key }: { key: keyof Beneficiary }) => {
    if (sortConfig.key !== key) return <ChevronDown className="w-4 h-4 text-muted-foreground" />;
    return sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />;
  };

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">High-Risk Beneficiaries</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search beneficiaries..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-64 sm:w-80"
                aria-label="Search beneficiaries"
              />
            </div>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as "all" | "critical" | "high" | "medium" | "low")}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="All Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={(v) => setRegionFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="hidden sm:flex">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-8"></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("code")}>
                  <div className="flex items-center gap-1">
                    Beneficiary <SortIcon key="code" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("region")}>
                  <div className="flex items-center gap-1">
                    Location <SortIcon key="region" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("riskScore")}>
                  <div className="flex items-center gap-1">
                    Risk Score <SortIcon key="riskScore" />
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Risk Level</TableHead>
                <TableHead className="hidden md:table-cell">Last Activity</TableHead>
                <TableHead className="hidden lg:table-cell">Trend</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 opacity-50" />
                      <p>No beneficiaries match the current filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((beneficiary) => (
                  <TableRow key={beneficiary.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm">
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0" aria-label={`View ${beneficiary.code} details`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{beneficiary.code}</p>
                        <p className="text-xs text-muted-foreground">{beneficiary.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="text-sm">{beneficiary.region}</p>
                        <p className="text-xs text-muted-foreground">{beneficiary.subCounty}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums">{formatRiskScore(beneficiary.riskScore)}</span>
                        <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${beneficiary.riskScore * 100}%`,
                              backgroundColor: `var(--risk-${beneficiary.riskTier})`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className={cn(RISK_TIER_COLORS[beneficiary.riskTier], "text-xs")}>
                        {getRiskTierLabel(beneficiary.riskTier)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{new Date(beneficiary.lastActivity).toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          beneficiary.trend === "improving" && "text-success",
                          beneficiary.trend === "declining" && "text-destructive",
                          beneficiary.trend === "stable" && "text-muted-foreground"
                        )}
                      >
                        {beneficiary.trend === "improving" && "↑ Improving"}
                        {beneficiary.trend === "declining" && "↓ Declining"}
                        {beneficiary.trend === "stable" && "→ Stable"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 px-2"
                        onClick={() => {}}
                        aria-label={`View recommended action for ${beneficiary.code}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <nav role="navigation" aria-label="pagination" className="mx-auto flex w-full justify-center">
              <ul className="flex items-center gap-1">
                <li>
                  <Button
                    variant={page === 1 ? "outline" : "ghost"}
                    size="icon"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    aria-label="Go to previous page"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </Button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <li key={pageNum}>
                      <Button
                        variant={page === pageNum ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => setPage(pageNum)}
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={page === pageNum ? "page" : undefined}
                      >
                        {pageNum}
                      </Button>
                    </li>
                  );
                })}
                <li>
                  <Button
                    variant={page === totalPages ? "outline" : "ghost"}
                    size="icon"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Go to next page"
                  >
                    <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                  </Button>
                </li>
              </ul>
            </nav>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} beneficiaries
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}