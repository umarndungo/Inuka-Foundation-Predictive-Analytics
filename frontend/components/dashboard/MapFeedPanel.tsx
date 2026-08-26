"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, X } from "lucide-react";
import { FeedRow } from "./FeedRow";
import type { Beneficiary } from "@/types";

interface MapFeedPanelProps {
  beneficiaries: Beneficiary[];
  selectedId?: string | null;
  onSelect: (b: Beneficiary) => void;
  className?: string;
}

export function MapFeedPanel({ beneficiaries, selectedId, onSelect, className }: MapFeedPanelProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("all");

  const filtered = useMemo(() => {
    let list = beneficiaries;
    if (tierFilter !== "all") list = list.filter((b) => b.riskTier === tierFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          b.region.toLowerCase().includes(q) ||
          b.subCounty.toLowerCase().includes(q)
      );
    }
    return list;
  }, [beneficiaries, tierFilter, search]);

  const tierCounts = useMemo(() => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    beneficiaries.forEach((b) => { counts[b.riskTier]++; });
    return counts;
  }, [beneficiaries]);

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Beneficiary Feed</h3>
          <span className="text-[11px] font-mono text-muted-foreground">{beneficiaries.length}</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, region…"
            className="h-7 pl-7 pr-7 text-xs rounded border-border/60 bg-secondary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Tier chips */}
        <div className="flex items-center gap-1.5">
          {(["all", "HIGH", "MEDIUM", "LOW"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors",
                tierFilter === tier
                  ? tier === "HIGH"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : tier === "MEDIUM"
                    ? "bg-zinc-100 border-zinc-200 text-zinc-700"
                    : tier === "LOW"
                    ? "bg-zinc-50 border-zinc-200 text-zinc-500"
                    : "bg-foreground text-primary-foreground border-foreground"
                  : "bg-transparent border-border/40 text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {tier === "all" ? "All" : tier}
              {tier !== "all" && (
                <span className="ml-1 opacity-70">{tierCounts[tier]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground">
            <p>No beneficiaries match your filters</p>
          </div>
        ) : (
          filtered.map((b) => (
            <FeedRow
              key={b.id}
              beneficiary={b}
              selected={b.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
