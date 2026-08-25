import { Search, X } from "lucide-react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Button } from "./button";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  riskFilter?: string;
  onRiskFilterChange?: (val: string) => void;
  regionFilter?: string;
  onRegionFilterChange?: (val: string) => void;
  regions?: string[];
  extraFilters?: React.ReactNode;
  onResetFilters?: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search records...",
  riskFilter,
  onRiskFilterChange,
  regionFilter,
  onRegionFilterChange,
  regions = ["Nairobi", "Kisumu", "Nakuru", "Mombasa", "Eldoret"],
  extraFilters,
  onResetFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    search !== "" ||
    (riskFilter && riskFilter !== "all") ||
    (regionFilter && regionFilter !== "all");

  return (
    <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border shadow-xs mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {riskFilter !== undefined && onRiskFilterChange && (
        <Select value={riskFilter} onValueChange={(val) => val && onRiskFilterChange(val)}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="HIGH">High (≥0.75)</SelectItem>
            <SelectItem value="MEDIUM">Medium (0.45–0.74)</SelectItem>
            <SelectItem value="LOW">Low (&lt;0.45)</SelectItem>
          </SelectContent>
        </Select>
      )}

      {regionFilter !== undefined && onRegionFilterChange && (
        <Select value={regionFilter} onValueChange={(val) => val && onRegionFilterChange(val)}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {extraFilters}

      {hasActiveFilters && onResetFilters && (
        <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
